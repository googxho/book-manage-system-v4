package com.example.controller.exception;

import com.example.entity.RestBean;
import jakarta.validation.ValidationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 接口参数校验异常处理器。
 * <p>
 * 当 {@code @Valid} / {@code @Validated} 校验失败时，
 * Spring 会抛出 {@link ValidationException}，由本类统一捕获并转为 400 响应。
 */
@Slf4j
@RestControllerAdvice
public class ValidationController {

    @ExceptionHandler(ValidationException.class)
    public RestBean<Void> validateError(ValidationException exception) {
        log.warn("Resolved [{}: {}]", exception.getClass().getName(), exception.getMessage());
        return RestBean.failure(400, "请求参数有误");
    }
}
