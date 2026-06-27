package com.example.controller.exception;

import com.example.entity.RestBean;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 全局未捕获异常兜底处理器。
 * <p>
 * 当请求处理过程中抛出了未被其他 {@code @ExceptionHandler} 处理的异常时，
 * 由本类统一捕获并返回 500 响应，避免异常信息直接暴露给前端。
 * <p>
 * 典型的未捕获异常场景：
 * <pre>
 *   NullPointerException           — 空指针（代码 bug）
 *   IllegalArgumentException      — 非法参数
 *   DataAccessException           — 数据库访问失败
 *   RedisConnectionFailureException — Redis 连接失败
 *   AmqpException                 — RabbitMQ 通信异常
 *   ...
 * </pre>
 * <p>
 * {@code @RestControllerAdvice} 的原理：
 * <ol>
 *   <li>Spring 在启动时扫描所有带 {@code @ControllerAdvice} 的类</li>
 *   <li>记录其中 {@code @ExceptionHandler} 注解的方法及其声明的异常类型</li>
 *   <li>请求处理过程中，{@code DispatcherServlet} 的 {@code try-catch}
 *       抓住 Controller 抛出的异常</li>
 *   <li>{@code DispatcherServlet} 遍历 {@code HandlerExceptionResolver} 列表，
 *       最终由 {@code ExceptionHandlerExceptionResolver} 匹配异常类型并
 *       反射调用对应的方法</li>
 * </ol>
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * 处理所有未预料到的系统异常。
     * <p>
     * 作为兜底处理器，捕获未被其他 {@code @ExceptionHandler} 处理的异常，
     * 记录 error 级别日志（含完整堆栈）后返回 500 响应。
     *
     * @param exception 未捕获的异常
     * @return 500 错误响应
     */
    @ExceptionHandler(Exception.class)
    public RestBean<Void> handleException(Exception exception) {
        log.error("未捕获的异常 [{}]: {}", exception.getClass().getName(), exception.getMessage(), exception);
        return RestBean.failure(500, "内部错误，请联系管理员");
    }
}


// ═════════════════════════════════════════════════════════════════════════
//
//  ╔══════════════════════════════════════════════════════════════════╗
//  ║                                                              ║
//  ║  全局异常处理器的工作原理 —— 它是怎么捕获所有异常的？          ║
//  ║                                                              ║
//  ╚══════════════════════════════════════════════════════════════════╝
//
//  你的猜测基本正确，但需要补充关键细节。
//
//  所有的异常都会继承 Exception——✅ 这是对的。
//
//  但不是"异常自己来找 GlobalExceptionHandler"，而是有一条完整的
//  捕获链条。下面拆开来讲。
//
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║                                                              ║
// ║  第 1 步：@ExceptionHandler(Exception.class) 是什么意思？     ║
// ║                                                              ║
// ╚══════════════════════════════════════════════════════════════════╝
//
//  这行代码做了两件事：
//
//  ① @ExceptionHandler 注解
//     告诉 Spring："这个方法是一个异常处理器，可以用来处理异常"
//
//  ② (Exception.class) 参数
//     声明这个处理器能处理哪些异常类型——Exception 及其所有子类。
//
//  Java 的异常继承体系：
//
//       java.lang.Throwable
//          ├── java.lang.Error                ← 严重错误（内存溢出等）
//          │     （@ExceptionHandler 不处理 Error）
//          │
//          └── java.lang.Exception            ← 这就是你猜的那个
//                 ├── java.lang.RuntimeException    ← 运行时异常
//                 │     ├── NullPointerException
//                 │     ├── IllegalArgumentException
//                 │     ├── DataAccessException     ← MyBatis 抛的
//                 │     └── ...
//                 │
//                 ├── jakarta.validation.ValidationException  ← 参数校验
//                 ├── java.io.IOException
//                 ├── java.sql.SQLException
//                 └── ...
//
//  因为 Exception 是所有"可处理异常"的根父类，所以声明为
//  @ExceptionHandler(Exception.class) 相当于说：
//
//    "只要是 Exception 类或者它的任何子类，我统统都能处理。"
//
//  这就是"兜底"的含义——不管抛的是什么异常，只要继承 Exception，
//  这个方法就能接到。
//
//  那 @ExceptionHandler 不处理 Error 呢？对，不处理。
//  Error（如 OutOfMemoryError）是 JVM 级别的严重问题，
//  捕获了也没意义，程序已经活不成了。所以异常处理只关心 Exception。
//
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║                                                              ║
// ║  第 2 步：但是！有多个 @ExceptionHandler 时谁先处理？          ║
// ║                                                              ║
// ╚══════════════════════════════════════════════════════════════════╝
//
//  现在项目中有两个 @RestControllerAdvice 类：
//
//    ValidationController      @ExceptionHandler(ValidationException.class)
//    GlobalExceptionHandler    @ExceptionHandler(Exception.class)
//
//  问题来了：ValidationException 也继承自 Exception，那抛出一个
//  ValidationException 时，是 ValidationController 处理，还是
//  GlobalExceptionHandler 处理？
//
//  答案：ValidationController 先处理。
//
//  匹配规则是这样的：
//
//    ExceptionHandlerExceptionResolver 在匹配处理器时，不是简单地
//    "看谁先声明"或者"看类名顺序"，而是遵循"最精确匹配"原则：
//
//    抛出的异常类型：         ValidationException
//    候选处理器 A 能处理：    ValidationException.class   ✅ 精确匹配
//    候选处理器 B 能处理：    Exception.class             ✅ 父类匹配
//    结果：                   选择 A（更精确的那个）
//
//    抛出的异常类型：         NullPointerException
//    候选处理器 A 能处理：    ValidationException.class   ❌ 不匹配
//    候选处理器 B 能处理：    Exception.class             ✅ 匹配
//    结果：                   选择 B
//
//  所以执行顺序是：
//
//                   抛异常
//                      │
//                      ▼
//            查找 @ExceptionHandler 列表
//                      │
//                      ├── ValidationException 抛出了吗？
//                      │   ├─ 是 → ValidationController 处理 ✅
//                      │   └─ 否 → 继续看下一个
//                      │
//                      ├── ... 其他更具体的 @ExceptionHandler...
//                      │
//                      └── 最后才轮到 Exception.class
//                          └─ GlobalExceptionHandler 兜底 ✅
//
//  Exception.class 排在最后是因为它的匹配条件最宽泛——"只要是异常都行"。
//  Spring 内部会按"匹配精度"排序：子类 > 父类，越具体的越优先。
//
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║                                                              ║
// ║  第 3 步：异常是怎么从你的代码跑到这里的？完整的调用链        ║
// ║                                                              ║
// ╚══════════════════════════════════════════════════════════════════╝
//
//  假设你的 AccountServiceImpl.registerEmailAccount() 中，
//  因为数据库连接失败，拋出了一个 DataAccessException：
//
//     ┌─────────────────────────────────────────────────────────────┐
//     │  ① your code                                               │
//     │     accountService.registerEmailAccount(vo)                │
//     │       → mapper.insert(account)                             │
//     │         → MyBatis 执行 SQL                                 │
//     │           → 数据库连接失败                                  │
//     │             → MyBatis 抛出 DataAccessException             │
//     │                                                            │
//     │  ② 异常向上冒泡                                            │
//     │     DataAccessException                                    │
//     │       ↑ 沿着调用栈一路向上                                  │
//     │       → AccountServiceImpl.registerEmailAccount()  ← 没 catch│
//     │       → AuthorizeController.register()             ← 没 catch│
//     │       → 反射调用层 (MethodInvocation)               ← 没 catch│
//     │       → HandlerAdapter.handle()                     ← 没 catch│
//     │         ↑                                              │
//     │         └──────────────────────────────────────────────────┘
//     │                                                            │
//     │  ③ ★ DispatcherServlet 的 try-catch 抓住了 ★              │
//     │     public void doDispatch() {                             │
//     │         try {                                              │
//     │             ModelAndView mv = adapter.handle(...);          │
//     │         } catch (Exception ex) {                           │
//     │             // ★ 就在这里！ ★                               │
//     │             processDispatchResult(req, res, mv, ex);        │
//     │         }                                                   │
//     │     }                                                       │
//     │                                                            │
//     │  ④ processDispatchResult 调用 processHandlerException       │
//     │                                                            │
//     │  ⑤ processHandlerException 遍历 HandlerExceptionResolver   │
//     │                                                            │
//     │     ResultResolver[] resolvers = {                          │
//     │         ExceptionHandlerExceptionResolver,   ← 扫描         │
//     │         ResponseStatusExceptionResolver,    @ExceptionHandler│
//     │         DefaultHandlerExceptionResolver,      的            │
//     │         ...                                     那个       │
//     │     };                                                     │
//     │                                                            │
//     │     for (HandlerExceptionResolver resolver : resolvers) {  │
//     │         ModelAndView mv = resolver.resolveException(       │
//     │             request, response, handler, ex);               │
//     │         if (mv != null) {                                  │
//     │             // 这个 resolver 说"我能处理"                   │
//     │             return mv;                                     │
//     │         }                                                  │
//     │     }                                                      │
//     │     // 所有 resolver 都返回 null → 异常继续往外抛          │
//     │                                                            │
//     │  ⑥ ExceptionHandlerExceptionResolver 内部做了什么？        │
//     │     a) 它提前缓存了所有 @ControllerAdvice 类及其中          │
//     │        的 @ExceptionHandler 方法（启动时就扫描好了）         │
//     │     b) 拿当前异常的类型（DataAccessException），去缓存      │
//     │        中找匹配的 @ExceptionHandler                          │
//     │     c) 找到 GlobalExceptionHandler.handleException(        │
//     │           @ExceptionHandler(Exception.class))              │
//     │        → DataAccessException 是 Exception 的子类 → 匹配 ✅ │
//     │     d) 通过反射调用 handleException(exception) 方法        │
//     │        → 返回 RestBean.failure(500, "内部错误...")          │
//     │     e) 把 RestBean 包装成 ModelAndView 返回给               │
//     │        DispatcherServlet                                    │
//     │                                                            │
//     │  ⑦ DispatcherServlet 收到 ModelAndView，把 RestBean        │
//     │     序列化为 JSON，写入 HTTP 响应                           │
//     │                                                            │
//     │     前端收到：                                              │
//     │       { "code": 500, "message": "内部错误，请联系管理员" }  │
//     └─────────────────────────────────────────────────────────────┘
//
//  所以它并不是"自动感知"到异常的——而是有一层层的 try-catch、
//  一个责任链（resolver 列表）和反射调用，最终把你的 @ExceptionHandler
//  方法给调用了。
//
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║                                                              ║
// ║  第 4 步：log.error 是在哪里打印的？栈信息又是从哪来的？      ║
// ║                                                              ║
// ╚══════════════════════════════════════════════════════════════════╝
//
//  看这行代码：
//
//     log.error("未捕获的异常 [{}]: {}", type, msg, exception);
//
//  log.error() 是 SLF4J 的 API。当你传入一个 Throwable 参数时，
//  Logback 会自动调用 exception.printStackTrace() 的等价逻辑——
//  遍历异常的 stackTrace 数组，把每一行 "at xxx.xxx(Xxx.java:123)"
//  拼成字符串，写入日志。
//
//  exception.getStackTrace() 返回 StackTraceElement[]，每个元素包含：
//    ├─ getClassName()    → "com.example.service.impl.AccountServiceImpl"
//    ├─ getMethodName()   → "registerEmailAccount"
//    ├─ getFileName()     → "AccountServiceImpl.java"
//    └─ getLineNumber()   → 42
//
//  所以打印出来的堆栈长这样：
//
//     java.sql.SQLException: Connection refused
//         at com.example.mapper.AccountMapper.insert(Unknown Source)
//         at com.example.service.impl.AccountServiceImpl.registerEmailAccount(AccountServiceImpl.java:42)
//         at com.example.controller.AuthorizeController.register(AuthorizeController.java:35)
//         at org.springframework.web.method.support.InvocableHandlerMethod.doInvoke(...)
//         ...
//
//  这让你能从上往下读：先看到最上面是哪行代码报错，再往下看是谁调用了它。
//
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║                                                              ║
// ║  第 5 步：为什么 @ExceptionHandler(Exception.class) 不是万能的 ║
// ║                                                              ║
// ╚══════════════════════════════════════════════════════════════════╝
//
//  它捕获不了以下三种情况：
//
//  ① Error 及其子类
//      @ExceptionHandler(Exception.class) 只处理 Exception，不处理 Error。
//      OutOfMemoryError、StackOverflowError 捕获不了。
//      但也不需要——这些都是 JVM 崩溃级别的问题，返回 500 也没意义。
//
//  ② 在过滤器（Filter）中抛出的异常
//      @ExceptionHandler 只对 Controller 层有效。
//      如果异常在 Filter 中就抛了（比如 CorsFilter 里抛了异常），
//      此时还没进入 DispatcherServlet，ControllerAdvice 管不着。
//      Filter 中的异常由 Tomcat 容器捕获，转发到 /error 页面。
//
//  ③ 在 Security 过滤器链中抛出的异常
//      同理，Security 的过滤器在 DispatcherServlet 之前执行。
//      Spring Security 自己处理自己的异常（authenticationEntryPoint
//      和 accessDeniedHandler），不会走到 @ExceptionHandler。
//
//  所以这个全局异常处理器的覆盖范围是：
//
//    ┌─────────────────────────────────────────────────────────────┐
//    │  请求进入                                                   │
//    │     │                                                      │
//    │     ▼                                                      │
//    │  Tomcat                                                     │
//    │     │                                                      │
//    │     ▼                                                      │
//    │  Filter 链 (Cors / FlowLimit / RequestLog)                  │
//    │     │   异常在这里抛 → Tomcat 捕获 → 转发到 /error       │
//    │     ▼                                                      │
//    │  Security 过滤器链                                           │
//    │     │   异常在这里抛 → Security 自身处理                    │
//    │     ▼                                                      │
//    │  DispatcherServlet                                          │
//    │     │                                                      │
//    │     ▼                                                      │
//    │  Interceptor 前置处理                                       │
//    │     │                                                      │
//    │     ▼                                                      │
//    │  参数绑定 (@Valid 校验)                                      │
//    │     │   ValidationException → ValidationController ✅      │
//    │     ▼                                                      │
//    │  Controller 方法执行  ← ← ← @ExceptionHandler 的管辖范围    │
//    │     │   这里抛的任何 Exception → GlobalExceptionHandler ✅ │
//    │     ▼                                                      │
//    │  Interceptor 后置处理                                       │
//    └─────────────────────────────────────────────────────────────┘
//
//
// ╔══════════════════════════════════════════════════════════════════╗
// ║                                                              ║
// ║  总结：三句话                                                ║
// ║                                                              ║
// ╚══════════════════════════════════════════════════════════════════╝
//
//  ① Exception.class 是 Java 所有可处理异常的根父类，
//     所以 @ExceptionHandler(Exception.class) 能做到"来者不拒"。
//
//  ② 但调用这个方法的不是异常本身，而是 DispatcherServlet 的
//     try-catch → HandlerExceptionResolver 责任链 →
//     ExceptionHandlerExceptionResolver 反射调用。
//
//  ③ 它的覆盖范围是 Controller 执行过程中抛出的异常。
//     Filter/Security 层的异常它管不着，那边有另外的处理机制。
//
