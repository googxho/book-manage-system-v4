package com.example.filter;

import com.alibaba.fastjson2.JSONObject;
import com.example.utils.Const;
import com.example.utils.SnowflakeIdGenerator;
import jakarta.annotation.Resource;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

import java.io.IOException;
import java.util.Set;

/**
 * 请求日志过滤器 —— 记录每个 HTTP 请求的详细信息。
 * <p>
 * 功能：
 * ├─ 为每个请求生成唯一的追踪 ID（雪花算法），存入 MDC
 * ├─ 记录请求 URL、方法、远程 IP、用户身份（已认证/未验证）
 * ├─ 记录请求参数列表
 * ├─ 记录处理耗时和响应结果
 * └─ 忽略 Swagger 相关路径，避免日志刷屏
 * <p>
 * ★ 关于 MDC（Mapped Diagnostic Context）：
 * 本过滤器使用 MDC.put("reqId", id) 将追踪 ID 存入线程上下文，
 * 之后在整个请求处理链路中，所有日志都会带上这个 reqId。
 * 配合 logback-spring.xml 中的 %X{reqId} 占位符，每条日志都能
 * 显示请求追踪 ID，方便在日志文件中搜索全链路。
 * <p>
 * 执行顺序（在 Security 过滤器链中）：
 * RequestLogFilter → JwtAuthorizeFilter → UsernamePasswordAuthenticationFilter → Controller
 *     ↑ 先生成 reqId       ↑ 解析 JWT 设置用户身份
 */
@Slf4j
@Component
public class RequestLogFilter extends OncePerRequestFilter {

    @Resource
    SnowflakeIdGenerator generator;

    /** 不需要记录日志的路径前缀 */
    private final Set<String> ignores = Set.of("/swagger-ui", "/v3/api-docs");

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // 如果是 Swagger 相关路径，直接放行，不记录日志
        if (this.isIgnoreUrl(request.getServletPath())) {
            filterChain.doFilter(request, response);
        } else {
            long startTime = System.currentTimeMillis();
            // 记录请求开始信息（URL、IP、参数等）
            this.logRequestStart(request);
            // 包装响应，以便在过滤器链执行完后读取响应内容
            ContentCachingResponseWrapper wrapper = new ContentCachingResponseWrapper(response);
            filterChain.doFilter(request, wrapper);
            // 记录请求结束信息（耗时、响应结果）
            this.logRequestEnd(wrapper, startTime);
            // 将缓存的响应内容写回到真正的 response 中
            wrapper.copyBodyToResponse();
        }
    }

    /**
     * 判断当前请求 URL 是否不需要记录日志。
     *
     * @param url 请求路径
     * @return true 表示忽略，不记录日志
     */
    private boolean isIgnoreUrl(String url) {
        for (String ignore : ignores) {
            if (url.startsWith(ignore)) return true;
        }
        return false;
    }

    /**
     * 请求结束时记录日志：处理耗时 + 响应状态码 / 结果。
     *
     * @param wrapper   响应包装类，用于读取响应内容
     * @param startTime 请求开始时间戳
     */
    public void logRequestEnd(ContentCachingResponseWrapper wrapper, long startTime) {
        long time = System.currentTimeMillis() - startTime;
        int status = wrapper.getStatus();
        String content = status != 200 ?
                status + " 错误" : new String(wrapper.getContentAsByteArray());
        log.info("请求处理耗时: {}ms | 响应结果: {}", time, content);
    }

    /**
     * 请求开始时记录日志：URL、方法、IP、用户身份、角色、请求参数。
     * <p>
     * 同时生成雪花算法追踪 ID 并存入 MDC，后续所有日志都会带上这个 ID。
     *
     * @param request HTTP 请求
     */
    public void logRequestStart(HttpServletRequest request) {
        // 生成唯一的请求追踪 ID，存入 MDC（日志格式中的 %X{reqId} 会读取它）
        long reqId = generator.nextId();
        MDC.put("reqId", String.valueOf(reqId));

        // 收集请求参数
        JSONObject object = new JSONObject();
        request.getParameterMap().forEach((k, v) -> object.put(k, v.length > 0 ? v[0] : null));

        // 从请求属性中获取用户 ID（由 JwtAuthorizeFilter 设置）
        Object id = request.getAttribute(Const.ATTR_USER_ID);
        if (id != null) {
            // 已认证用户：打印用户名、UID、角色
            User user = (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            log.info("请求URL: \"{}\" ({}) | 远程IP地址: {} │ 身份: {} (UID: {}) | 角色: {} | 请求参数列表: {}",
                    request.getServletPath(), request.getMethod(), request.getRemoteAddr(),
                    user.getUsername(), id, user.getAuthorities(), object);
        } else {
            // 未认证用户（如登录、注册等公开接口）
            log.info("请求URL: \"{}\" ({}) | 远程IP地址: {} │ 身份: 未验证 | 请求参数列表: {}",
                    request.getServletPath(), request.getMethod(), request.getRemoteAddr(), object);
        }
    }
}
