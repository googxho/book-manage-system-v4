package com.example.filter;

import com.example.entity.RestBean;
import com.example.utils.Const;
import com.example.utils.FlowUtils;
import jakarta.annotation.Resource;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.PrintWriter;

/**
 * 限流控制过滤器 —— 防止单个 IP 高频请求接口。
 * <p>
 * 基于 Redis 的滑动窗口计数器，在指定时间周期内限制单个 IP 的最大请求次数。
 * 超出限制后将 IP 封禁一段时间，封禁期间所有请求直接返回 429。
 * <p>
 * 执行顺序（在整个过滤器链中）：
 * CorsFilter (ORDER=-102) → FlowLimitingFilter (ORDER=-101) → Security 过滤器链
 *     ↑ 先处理跨域            ↑ 再 IP 限流             ↑ 最后认证授权
 * <p>
 * 配置来源（application-dev.yaml）：
 *   spring.web.flow.period: 3    ← 计数周期（秒）
 *   spring.web.flow.limit:  50   ← 周期内最大请求次数
 *   spring.web.flow.block:  30   ← 超限封禁时间（秒）
 */
@Slf4j
@Component
@Order(Const.ORDER_FLOW_LIMIT)
public class FlowLimitingFilter extends HttpFilter {

    @Resource
    StringRedisTemplate template;

    /** 指定时间内的最大请求次数限制 */
    @Value("${spring.web.flow.limit}")
    int limit;

    /** 计数时间周期（秒） */
    @Value("${spring.web.flow.period}")
    int period;

    /** 超出请求限制后的封禁时间（秒） */
    @Value("${spring.web.flow.block}")
    int block;

    @Resource
    FlowUtils utils;

    @Override
    protected void doFilter(HttpServletRequest request,
                            HttpServletResponse response,
                            FilterChain chain) throws IOException, ServletException {
        String address = request.getRemoteAddr();
        // 尝试对当前 IP 进行计数
        if (this.tryCount(address)) {
            // 通过限流检查 → 继续执行过滤器链
            chain.doFilter(request, response);
        } else {
            // 超出频率限制 → 返回 429
            this.writeBlockMessage(response);
        }
    }

    /**
     * 尝试对指定 IP 地址进行请求计数。
     * <p>
     * 逻辑：
     * 1. 先检查该 IP 是否已被封禁 → 被封禁则直接返回 false
     * 2. 未被封禁 → 调用 FlowUtils.limitPeriodCheck() 进行滑动窗口计数
     * 3. 如果在周期内超过限制次数 → 自动封禁，返回 false
     * 4. 未超过限制 → 返回 true
     *
     * @param address 请求 IP 地址
     * @return true 表示通过限流检查；false 表示被限流拦截
     */
    private boolean tryCount(String address) {
        synchronized (address.intern()) {
            // 检查是否已被封禁
            if (Boolean.TRUE.equals(template.hasKey(Const.FLOW_LIMIT_BLOCK + address)))
                return false;
            String counterKey = Const.FLOW_LIMIT_COUNTER + address;
            String blockKey = Const.FLOW_LIMIT_BLOCK + address;
            return utils.limitPeriodCheck(counterKey, blockKey, block, limit, period);
        }
    }

    /**
     * 向客户端返回限流拦截信息（HTTP 429）。
     *
     * @param response HTTP 响应
     * @throws IOException 写入响应时可能发生的异常
     */
    private void writeBlockMessage(HttpServletResponse response) throws IOException {
        response.setStatus(429);
        response.setContentType("application/json;charset=utf-8");
        PrintWriter writer = response.getWriter();
        writer.write(RestBean.failure(429, "请求频率过快，请稍后再试").asJsonString());
    }
}
