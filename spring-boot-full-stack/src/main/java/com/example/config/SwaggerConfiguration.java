package com.example.config;

import com.example.entity.RestBean;
import com.example.entity.vo.response.AuthorizeVO;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import io.swagger.v3.oas.models.ExternalDocumentation;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.parameters.QueryParameter;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.responses.ApiResponses;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Swagger / OpenAPI 文档自动生成配置。
 * <p>
 * 项目启动后可通过以下地址访问 API 文档：
 * ├─ Swagger UI：  http://localhost:8080/swagger-ui/index.html
 * └─ API JSON：    http://localhost:8080/v3/api-docs
 * <p>
 * 功能：
 * ├─ 自动扫描所有 @RestController，提取 @RequestMapping 等注解生成文档
 * ├─ 手动补充登录/退出接口的文档（因这两个接口由 Spring Security 处理，非 @RestController）
 * ├─ 配置全局 Bearer Token 认证（已登录的接口需要在 Swagger 中点击"Authorize"输入 JWT）
 * └─ 自定义文档标题、描述、版本号等信息
 */
@Configuration
@SecurityScheme(type = SecuritySchemeType.HTTP, scheme = "Bearer",
        name = "Authorization", in = SecuritySchemeIn.HEADER)
@OpenAPIDefinition(security = { @SecurityRequirement(name = "Authorization") })
public class SwaggerConfiguration {

    /**
     * 配置文档介绍信息：标题、描述、版本、开源地址等。
     */
    @Bean
    public OpenAPI springShopOpenAPI() {
        return new OpenAPI()
                .info(new Info().title("示例项目 API 文档")
                        .description("欢迎来到本示例项目API测试文档，在这里可以快速进行接口调试")
                        .version("1.0")
                        .license(new License()
                                .name("项目开源地址")
                                .url("https://github.com/Ketuer/SpringBoot-Vue-Template-Jwt")
                        )
                )
                .externalDocs(new ExternalDocumentation()
                        .description("我们的官方网站")
                        .url("https://itbaima.net")
                );
    }

    /**
     * 手动补充 Spring Security 处理的接口（登录/退出）到 API 文档中。
     * <p>
     * 因为 /api/auth/login 和 /api/auth/logout 是由 Security 过滤器链处理的，
     * 不是普通的 @RestController，所以 Swagger 自动扫描不到它们。
     * 这里手动添加到 OpenAPI 的 paths 中。
     */
    @Bean
    public OpenApiCustomizer customerGlobalHeaderOpenApiCustomizer() {
        return api -> this.authorizePathItems().forEach(api.getPaths()::addPathItem);
    }

    /**
     * 构建需要手动补充的接口路径项。
     *
     * @return 路径 → PathItem 的映射
     */
    private Map<String, PathItem> authorizePathItems(){
        Map<String, PathItem> map = new HashMap<>();

        // POST /api/auth/login — 登录接口
        map.put("/api/auth/login", new PathItem()
                .post(new Operation()
                        .tags(List.of("登录校验相关"))
                        .summary("登录验证接口")
                        .addParametersItem(new QueryParameter()
                                .name("username")
                                .required(true)
                        )
                        .addParametersItem(new QueryParameter()
                                .name("password")
                                .required(true)
                        )
                        .responses(new ApiResponses()
                                .addApiResponse("200", new ApiResponse()
                                        .description("OK")
                                        .content(new Content().addMediaType("*/*", new MediaType()
                                                .example(RestBean.success(new AuthorizeVO()).asJsonString())
                                        ))
                                )
                        )
                )
        );

        // GET /api/auth/logout — 退出登录接口
        map.put("/api/auth/logout", new PathItem()
                .get(new Operation()
                        .tags(List.of("登录校验相关"))
                        .summary("退出登录接口")
                        .responses(new ApiResponses()
                                .addApiResponse("200", new ApiResponse()
                                        .description("OK")
                                        .content(new Content().addMediaType("*/*", new MediaType()
                                                .example(RestBean.success())
                                        ))
                                )
                        )
                )
        );

        return map;
    }
}
