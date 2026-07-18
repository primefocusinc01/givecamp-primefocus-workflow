package org.primfocusinc.workflow.config;

import com.google.firebase.auth.FirebaseAuth;
import org.primfocusinc.workflow.security.FirebaseTokenAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Local-dev security configuration: every request is permitted so the app
 * is easy to hit without a real Firebase ID token.
 * <p>
 * Deliberately does <em>not</em> enable {@code @EnableMethodSecurity}:
 * {@code authorizeHttpRequests().permitAll()} only governs the filter
 * chain and has no effect on {@code @PreAuthorize} checks, which are
 * enforced independently by Spring's method-security AOP advice. Enabling
 * it here would mean role-gated endpoints (e.g. {@code UserController})
 * still reject requests without a valid, role-bearing Firebase token even
 * in this "local" profile, defeating the point of it. The Firebase token
 * filter is still wired in so a real token, if supplied, still populates
 * the security context (useful for exercising role behavior on demand).
 */
@Configuration
@Profile("local")
public class LocalSecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, FirebaseAuth firebaseAuth) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .addFilterBefore(new FirebaseTokenAuthenticationFilter(firebaseAuth), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
