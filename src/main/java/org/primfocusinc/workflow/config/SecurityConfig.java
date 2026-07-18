package org.primfocusinc.workflow.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Default security configuration used everywhere except the "local" profile
 * (which has its own {@link LocalSecurityConfig}).
 * <p>
 * There are currently no session-based login flows or protected REST
 * endpoints in the application - it only serves the static React frontend -
 * so all requests are permitted. As authenticated endpoints are added, this
 * should be tightened to restrict access to those specific routes instead of
 * permitting everything.
 */
@Configuration
@Profile("!local")
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        return http.build();
    }
}
