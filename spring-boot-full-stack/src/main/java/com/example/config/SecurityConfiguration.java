package com.example.config;

import com.example.entity.RestBean;
import com.example.entity.vo.response.AuthorizeVO;
import com.example.filter.JwtAuthorizeFilter;
import com.example.filter.RequestLogFilter;
import com.example.utils.JwtUtils;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;
import java.io.PrintWriter;



/**
 * Spring Security 核心配置类。
 * <p>
 * 整个认证/授权流程概述：
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  1. 用户发送请求（如 /api/auth/login）                                │
 * │     ↓                                                                │
 * │  2. 请求先经过 JwtAuthorizeFilter（在 UsernamePasswordAuthentication │
 * │      Filter 之前执行）                                                │
 * │     ├─ 如果请求头携带有效 JWT → 解析出 UserDetails，设置到            │
 * │     │  SecurityContext 中，标记为已认证，放行                          │
 * │     └─ 如果没有 JWT / JWT 无效 → 不做任何处理，继续执行过滤器链       │
 * │     ↓                                                                │
 * │  3. 如果是 /api/auth/** 路径 → 直接放行（permitAll）                  │
 * │     其他路径 → 需要认证（authenticated）                              │
 * │     ↓                                                                │
 * │  4. 如果未认证 → 根据请求路径进入不同的处理逻辑：                     │
 * │     ├─ POST /api/auth/login    → 表单登录（formLogin）                │
 * │     │    ├─ 成功 → onAuthSuccess() → 生成 JWT 返回前端                │
 * │     │    └─ 失败 → onAuthFailure() → 返回 401 错误信息                │
 * │     ├─ POST /api/auth/logout   → 退出登录（logout）                   │
 * │     │    └─ 成功 → onLogoutSuccess()                                  │
 * │     └─ 其他未认证请求 → 返回 403/401（由 Spring Security 默认处理）    │
 * └──────────────────────────────────────────────────────────────────────┘
 */
@Configuration  // 标记为配置类，Spring 在启动时会加载该类中的 @Bean 定义
public class SecurityConfiguration {

    // JWT 工具类，用于创建和解析 JWT 令牌
    @Resource      // 按字段名 "utils" 查找 Bean → 找到 JwtUtils 的实例
    JwtUtils utils;

    @Resource      // 按字段名 "jwtAuthorizeFilter" 查找 → 找到 JwtAuthorizeFilter 的实例
    JwtAuthorizeFilter jwtAuthorizeFilter;

    // 请求日志过滤器，记录每个请求的 URL、IP、耗时、响应等
    @Resource
    RequestLogFilter requestLogFilter;

    // 数据库用户认证服务，登录时自动从数据库加载用户信息
    @Resource
    UserDetailsService userDetailsService;

    /**
     * 核心安全过滤器链配置 —— 定义所有 HTTP 安全规则。
     * <p>
     * 构建流程（链式调用）：
     * 1. 配置 URL 访问权限
     * 2. 配置表单登录
     * 3. 配置退出登录
     * 4. 关闭 CSRF（前后端分离项目不需要）
     * 5. 设置无状态会话（用 JWT，不用 Session）
     * 6. 注册自定义 JWT 过滤器
     * 7. 构建 SecurityFilterChain
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
                // ========== 1. 请求授权配置 ==========
                .authorizeHttpRequests(conf -> {
                    // ──────────────────────────────────────────────────────────
                    // requestMatchers(...).permitAll()  +  anyRequest().authenticated()
                    // 这两句组合起来的效果等价于：
                    //
                    //   if (请求路径以 /api/auth/ 开头) {
                    //       直接放行 ✅
                    //   } else {
                    //       需要登录认证 🔒
                    //   }
                    //
                    // 为什么不用 if-else？
                    // 因为 authorizeHttpRequests 的 API 是"声明式规则注册"——
                    // 它内部会按注册顺序逐一匹配规则，**第一个匹配到的规则生效**。
                    // 所以 requestMatchers 写在前面相当于 if，anyRequest 写在
                    // 后面相当于 else（因为它匹配"任何其他请求"）。
                    //
                    // 如果反过来写（anyRequest 在前、requestMatchers 在后），
                    // 那么 anyRequest 会先匹配到所有请求，后面的规则就永远失效了。
                    // ──────────────────────────────────────────────────────────

                    // /api/auth/** 开头的请求（登录、注册等）不需要认证，直接放行
                    conf.requestMatchers("/api/auth/**").permitAll();
                    // /error 是 Spring Boot 内置的错误处理路径，也要放行
                    // 否则参数校验失败时，Spring 转发到 /error，Spring Security 又把它
                    // 重定向到 /login，导致用户看到的是 302 而不是具体的错误信息
                    conf.requestMatchers("/error").permitAll();
                    // /swagger-ui/** 和 /v3/api-docs/** 是 Swagger 文档路径，不需要认证
                    // 这样开发者在浏览器打开 http://localhost:8080/swagger-ui/index.html
                    // 就能直接看到 API 文档，不需要先登录
                    conf.requestMatchers("/swagger-ui/**", "/v3/api-docs/**").permitAll();
                    // 其他所有请求都需要登录认证后才能访问
                    conf.anyRequest().authenticated();
                })
                // ========== 2. 表单登录配置 ==========
                .formLogin(conf -> {
                    // 指定登录接口的 URL 路径（前端 POST 提交到此地址）
                    conf.loginProcessingUrl("/api/auth/login");
                    // 登录成功后的回调处理器 ——> onAuthSuccess()
                    conf.successHandler(this::onAuthSuccess);
                    // 登录失败后的回调处理器 ——> onAuthFailure()
                    conf.failureHandler(this::onAuthFailure);
                })
                // ========== 3. 退出登录配置 ==========
                .logout(conf -> {
                    // 退出登录的 URL 路径
                    conf.logoutUrl("/api/auth/logout");
                    // 退出成功后的回调处理器 ——> onLogoutSuccess()
                    conf.logoutSuccessHandler(this::onLogoutSuccess);
                })
                // ========== 4. 关闭 CSRF 防护 ==========
                // 前后端分离项目使用 Token（JWT）认证，不再需要 CSRF 防护
                .csrf(AbstractHttpConfigurer::disable)
                // ========== 5. 会话管理 ==========
                // 设置为"无状态"——服务端不创建 Session，每次请求都独立认证
                // 这强制每次请求都必须通过 JWT 来识别用户身份
                .sessionManagement(conf ->
                        conf.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // ========== 6. 异常处理 ==========
                // 不让 Spring Security 把未认证的请求重定向到 /login
                // 而是直接返回 JSON 格式的错误信息
                .exceptionHandling(conf -> {
                    // 未登录时访问需要认证的接口 → 返回 401
                    conf.authenticationEntryPoint((request, response, authException) -> {
                        response.setContentType("application/json;charset=utf-8");
                        response.setStatus(401);
                        PrintWriter writer = response.getWriter();
                        writer.write(RestBean.unauthorized("请先登录").asJsonString());
                    });
                    // 已登录但权限不足时 → 返回 403
                    conf.accessDeniedHandler((request, response, accessDeniedException) -> {
                        response.setContentType("application/json;charset=utf-8");
                        response.setStatus(403);
                        PrintWriter writer = response.getWriter();
                        writer.write(RestBean.forbidden("权限不足").asJsonString());
                    });
                })
                // ========== 7. 注册自定义过滤器 ==========
                // 过滤器链执行顺序（从前到后）：
                //   RequestLogFilter → JwtAuthorizeFilter → UsernamePasswordAuthenticationFilter
                //
                // ① RequestLogFilter：最先执行，为每个请求生成追踪 ID 并记录请求日志
                // ② JwtAuthorizeFilter：尝试从 Authorization 请求头中解析 JWT，
                //    如果 JWT 有效则设置认证信息到 SecurityContext
                // ③ UsernamePasswordAuthenticationFilter：Spring Security 内置，
                //    处理表单登录（/api/auth/login），认证通过后生成新 JWT
                .addFilterBefore(requestLogFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthorizeFilter, RequestLogFilter.class)
                // ========== 8. 构建 ==========
                .build();
    }

    /**
     * 退出登录成功后的回调。
     * <p>
     * 从请求头中取出 JWT，将其加入 Redis 黑名单（使其失效），
     * 这样即使 Token 未过期也无法再通过认证。
     * 然后返回成功响应给前端。
     *
     * @param request        HTTP 请求（从中获取 Authorization 请求头中的 JWT）
     * @param response       HTTP 响应（返回退出结果）
     * @param authentication 当前认证信息
     */
    private void onLogoutSuccess(HttpServletRequest request,
                                 HttpServletResponse response,
                                 Authentication authentication) throws IOException {
        // 从请求头中获取 JWT 并加入 Redis 黑名单
        String headerToken = request.getHeader("Authorization");
        if (headerToken != null && headerToken.startsWith("Bearer ")) {
            // ★ 检查 invalidateJwt 的返回值，确认 Redis 是否写入成功
            boolean invalidated = utils.invalidateJwt(headerToken);
            if (!invalidated) {
                // 如果拉黑失败（可能 Token 已过期或签名不匹配），返回警告信息
                response.setContentType("application/json;charset=utf-8");
                response.getWriter().write(
                        RestBean.failure(400, "退出登录失败：Token 已失效或无效").asJsonString());
                return;
            }
        }
        // 返回退出成功响应
        response.setContentType("application/json;charset=utf-8");
        response.getWriter().write(RestBean.success().asJsonString());
    }

    /**
     * 登录失败后的回调。
     * <p>
     * 向客户端返回 JSON 格式的错误信息，状态码 401。
     *
     * @param request  HTTP 请求
     * @param response HTTP 响应
     * @param e        认证异常信息（包含失败原因，如密码错误、用户不存在等）
     */
    private void onAuthFailure(HttpServletRequest request,
                               HttpServletResponse response,
                               AuthenticationException e) throws IOException {
        // 将异常信息封装为统一的 RestBean 格式返回给前端
        response.getWriter().write(
                RestBean.failure(401, e.getMessage()).asJsonString());
    }

    /**
     * 登录成功后的回调。
     * <p>
     * 认证通过后，生成 JWT 令牌并返回给前端，前端后续请求在
     * Authorization 请求头中携带此令牌即可通过 JwtAuthorizeFilter 的认证。
     * <p>
     * 流程：
     * 1. 从认证对象中获取用户信息（UserDetails）
     * 2. 调用 JwtUtils.createJwt() 生成 JWT 令牌
     * 3. 封装令牌、过期时间和用户信息到 AuthorizeVO
     * 4. 以统一 JSON 格式返回给前端
     *
     * @param request        HTTP 请求
     * @param response       HTTP 响应
     * @param authentication 认证成功后的用户认证信息（包含 UserDetails）
     */
    public void onAuthSuccess(HttpServletRequest request,
                              HttpServletResponse response,
                              Authentication authentication) throws IOException {
        // 设置响应类型为 JSON
        response.setContentType("application/json;charset=utf-8");

        // 从认证对象中取出已认证的用户主体（UserDetails）
        // Spring Security 认证成功后，authentication.getPrincipal() 就是 UserDetails
        UserDetails user = (UserDetails) authentication.getPrincipal();

        // ===== 获取数据库中的用户 ID =====
        // 登录时 JwtAuthorizeFilter 还未执行，所以不能从 request 属性拿 userId。
        // 通过 AccountService 从数据库查询完整的用户信息来获取 ID。
        com.example.service.AccountService accountService =
                (com.example.service.AccountService) userDetailsService;
        com.example.entity.dto.Account account =
                accountService.findAccountByNameOrEmail(user.getUsername());
        int userId = account != null ? account.getId() : 0;

        // ===== 生成 JWT 令牌 =====
        // 使用数据库中的真实用户名和用户 ID
        String token = utils.createJwt(user, user.getUsername(), userId);

        // ===== 判断是否触发频率限制 =====
        if (token == null) {
            // 用户在冷却期内频繁登录触发了频率限制
            response.getWriter().write(
                    RestBean.forbidden("登录验证频繁，请稍后再试").asJsonString());
            return;
        }

        // ===== 组装响应体 =====
        AuthorizeVO vo = new AuthorizeVO();
        vo.setExpire(utils.expireTime());   // 令牌过期时间
        vo.setRole(user.getAuthorities().stream()
                .findFirst()
                .map(Object::toString)
                .orElse("user"));          // 从数据库读取的角色
        vo.setToken(token);                 // JWT 令牌字符串
        vo.setUsername(user.getUsername()); // 从数据库读取的用户名

        // 以统一 JSON 格式返回
        response.getWriter().write(RestBean.success(vo).asJsonString());
    }
}
