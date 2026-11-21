package com.ridesharehub.config;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * SP4-P1-04: Serves the verified RideShareHub OpenAPI 3 specification and Swagger UI
 * directly from backend without SpringDoc/Jackson version conflicts on Spring Boot 4.1.
 */
@RestController
public class OpenApiDocsController {

    private static final String SPEC_PATH = "openapi/ridesharehub-openapi.yaml";
    private final String cachedOpenApiYaml;

    public OpenApiDocsController() {
        this.cachedOpenApiYaml = loadSpec();
    }

    @GetMapping(value = {"/v3/api-docs.yaml", "/v3/api-docs"}, produces = "application/yaml;charset=UTF-8")
    public ResponseEntity<String> openApiSpec() {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("application/yaml;charset=UTF-8"))
                .body(cachedOpenApiYaml);
    }

    @GetMapping(value = {"/swagger-ui.html", "/swagger-ui/index.html"}, produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> swaggerUi() {
        String html = """
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>RideShareHub API Documentation — Swagger UI</title>
                  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
                  <style>
                    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f8fafc; }
                    .rsh-banner { background: #0f172a; color: #ffffff; padding: 14px 24px; display: flex; justify-content: space-between; align-items: center; }
                    .rsh-banner h1 { font-size: 16px; margin: 0; }
                    .rsh-banner a { color: #38bdf8; font-size: 13px; text-decoration: none; font-weight: 600; }
                    #fallback-spec { display: none; max-width: 1100px; margin: 24px auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
                    #fallback-spec pre { overflow-x: auto; font-size: 12px; background: #0f172a; color: #e2e8f0; padding: 16px; border-radius: 8px; }
                  </style>
                </head>
                <body>
                  <header class="rsh-banner">
                    <h1>RideShareHub REST API Documentation (OpenAPI 3.0.3)</h1>
                    <a href="/v3/api-docs.yaml" target="_blank" rel="noopener">Tải OpenAPI YAML (/v3/api-docs.yaml)</a>
                  </header>
                  <div id="swagger-ui"></div>
                  <div id="fallback-spec">
                    <h2>RideShareHub OpenAPI Spec (/v3/api-docs.yaml)</h2>
                    <pre id="fallback-yaml"></pre>
                  </div>
                  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
                  <script>
                    window.addEventListener('load', function () {
                      if (window.SwaggerUIBundle) {
                        window.ui = SwaggerUIBundle({
                          url: '/v3/api-docs.yaml',
                          dom_id: '#swagger-ui',
                          deepLinking: true,
                          presets: [SwaggerUIBundle.presets.apis]
                        });
                      } else {
                        fetch('/v3/api-docs.yaml').then(r => r.text()).then(text => {
                          document.getElementById('fallback-spec').style.display = 'block';
                          document.getElementById('fallback-yaml').textContent = text;
                        });
                      }
                    });
                  </script>
                </body>
                </html>
                """;
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                .body(html);
    }

    private static String loadSpec() {
        ClassPathResource resource = new ClassPathResource(SPEC_PATH);
        try (InputStream is = resource.getInputStream()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            return "openapi: 3.0.3\ninfo:\n  title: RideShareHub API\n  version: 1.0.0\npaths: {}\n";
        }
    }
}
