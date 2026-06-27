package com.example.utils;

import org.springframework.stereotype.Component;

/**
 * 雪花算法 ID 生成器 —— 生成全局唯一的数值型 ID。
 * <p>
 * 为什么要用雪花算法？
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │ 数据库自增 ID：只能在单库中唯一，分库分表时会重复                     │
 * │ UUID：         太长（36字符），无序，影响数据库索引性能                 │
 * │ 雪花算法 ID：  短（19位数字），有序，全局唯一，适合做数据库主键          │
 * └─────────────────────────────────────────────────────────────────────┘
 * <p>
 * 生成规则（64 位 long）：
 * ┌────────────────────────────────────────────────────────────────────┐
 * │  0 │  41 位时间戳（毫秒）  │ 5位数据中心 │ 5位机器 │ 12位序列号  │
 * │  ↑ │  从 START_TIMESTAMP  │ 区分机房   │ 区分服  │ 同一毫秒内  │
 * │ 符号│  开始的毫秒数        │ (0-31)    │ 务器    │ 自增 (0-4095)│
 * │ 位  │                     │           │ (0-31)  │              │
 * └────┴─────────────────────┴───────────┴─────────┴──────────────┘
 * <p>
 * 同一毫秒内最多生成 4096 个不同 ID，远超一般系统的并发需求。
 */
@Component
public class SnowflakeIdGenerator {

    // 起始时间戳：2023-08-03 00:00:00（可自定义，决定了 ID 能用的最多年限）
    private static final long START_TIMESTAMP = 1691087910202L;

    // 各部分的位数分配
    private static final long DATA_CENTER_ID_BITS = 5L;   // 数据中心 ID 占 5 位 → 最多 32 个数据中心
    private static final long WORKER_ID_BITS = 5L;        // 机器 ID 占 5 位 → 每个数据中心最多 32 台机器
    private static final long SEQUENCE_BITS = 12L;        // 序列号占 12 位 → 每毫秒最多 4096 个 ID

    // 各部分的最大值（位移算法校验用）
    private static final long MAX_DATA_CENTER_ID = ~(-1L << DATA_CENTER_ID_BITS);
    private static final long MAX_WORKER_ID = ~(-1L << WORKER_ID_BITS);
    private static final long MAX_SEQUENCE = ~(-1L << SEQUENCE_BITS);

    // 各部分左移的位数（用于组装最终 ID）
    private static final long WORKER_ID_SHIFT = SEQUENCE_BITS;
    private static final long DATA_CENTER_ID_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS;
    private static final long TIMESTAMP_SHIFT = SEQUENCE_BITS + WORKER_ID_BITS + DATA_CENTER_ID_BITS;

    private final long dataCenterId;  // 数据中心 ID（本项目中固定为 1）
    private final long workerId;      // 机器 ID（本项目中固定为 1）
    private long lastTimestamp = -1L; // 上一次生成 ID 的时间戳
    private long sequence = 0L;       // 当前毫秒内的序列号

    /**
     * 默认构造器：数据中心 ID = 1，机器 ID = 1。
     * 单机部署直接用默认值即可。
     * 多机房多机器部署时，需从配置文件读取 dataCenterId 和 workerId。
     */
    public SnowflakeIdGenerator() {
        this(1, 1);
    }

    /**
     * 私有构造器：指定数据中心 ID 和机器 ID。
     *
     * @param dataCenterId 数据中心 ID（0 ~ 31）
     * @param workerId     机器 ID（0 ~ 31）
     */
    private SnowflakeIdGenerator(long dataCenterId, long workerId) {
        if (dataCenterId > MAX_DATA_CENTER_ID || dataCenterId < 0) {
            throw new IllegalArgumentException("Data center ID can't be greater than " + MAX_DATA_CENTER_ID + " or less than 0");
        }
        if (workerId > MAX_WORKER_ID || workerId < 0) {
            throw new IllegalArgumentException("Worker ID can't be greater than " + MAX_WORKER_ID + " or less than 0");
        }
        this.dataCenterId = dataCenterId;
        this.workerId = workerId;
    }

    /**
     * 生成一个新的雪花算法 ID（线程安全）。
     * <p>
     * 核心逻辑：
     * 1. 获取当前毫秒时间戳
     * 2. 如果与上次时间戳相同 → 序列号 +1（同一毫秒内的第 N 个 ID）
     * 3. 如果序列号达到上限（4095）→ 等待下一毫秒
     * 4. 如果时间戳变了 → 序列号重置为 0
     * 5. 将各部分按位移组装成 64 位 long
     *
     * @return 全局唯一的 64 位长整型 ID
     */
    public synchronized long nextId() {
        long timestamp = getCurrentTimestamp();
        // 时钟回拨检测：如果当前时间比上次还早，说明系统时间被调整了
        if (timestamp < lastTimestamp) {
            throw new IllegalStateException("Clock moved backwards. Refusing to generate ID.");
        }
        if (timestamp == lastTimestamp) {
            // 同一毫秒内：序列号自增，最多 4096 个
            sequence = (sequence + 1) & MAX_SEQUENCE;
            if (sequence == 0) {
                // 当前毫秒的序列号用完（超过 4095），等待下一毫秒
                timestamp = getNextTimestamp(lastTimestamp);
            }
        } else {
            // 新的一毫秒：序列号重置
            sequence = 0L;
        }
        lastTimestamp = timestamp;
        // 组装最终 ID：
        // (时间戳 - 起始时间) 左移 22 位  |  数据中心 ID 左移 17 位  |  机器 ID 左移 12 位  |  序列号
        return ((timestamp - START_TIMESTAMP) << TIMESTAMP_SHIFT) |
                (dataCenterId << DATA_CENTER_ID_SHIFT) |
                (workerId << WORKER_ID_SHIFT) |
                sequence;
    }

    private long getCurrentTimestamp() {
        return System.currentTimeMillis();
    }

    private long getNextTimestamp(long lastTimestamp) {
        long timestamp = getCurrentTimestamp();
        while (timestamp <= lastTimestamp) {
            timestamp = getCurrentTimestamp();
        }
        return timestamp;
    }
}
