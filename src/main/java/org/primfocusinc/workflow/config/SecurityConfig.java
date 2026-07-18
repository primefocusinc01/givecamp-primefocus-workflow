package org.primfocusinc.workflow.config;

import com.google.firebase.auth.FirebaseAuth;
import jakarta.servlet.http.HttpServletResponse;
import org.primfocusinc.workflow.security.FirebaseTokenAuthenticationFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Default security configuration used everywhere except the "local" profile
 * (which has its own {@link LocalSecurityConfig}).
 * <p>
 * The static React frontend remains publicly accessible, but {@code /api/**}
 * routes require a valid Firebase ID token (verified by
 * {@link FirebaseTokenAuthenticationFilter}). Individual endpoints can layer
 * on role checks (e.g. {@code @PreAuthorize("hasRole('ADMIN')")}) since
 * method security is enabled.
 */
@Configuration
@Profile("!local")
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, FirebaseAuth firebaseAuth) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptionHandling -> exceptionHandling
                .authenticationEntryPoint((request, response, authException) ->
                    response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Authentication required")))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll())
            .addFilterBefore(new FirebaseTokenAuthenticationFilter(firebaseAuth), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
