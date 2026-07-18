package org.primfocusinc.workflow.security;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Verifies the Firebase ID token sent as a {@code Bearer} token on incoming
 * requests and, if valid, populates the {@link SecurityContextHolder} with a
 * {@link FirebaseUserDetails} principal and role-based authorities.
 * <p>
 * Requests without a token, or with an invalid/expired one, are passed
 * through unauthenticated - it is up to {@code SecurityConfig}'s
 * {@code authorizeHttpRequests} rules to decide whether the target route
 * requires authentication.
 */
public class FirebaseTokenAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(FirebaseTokenAuthenticationFilter.class);
    private static final String BEARER_PREFIX = "Bearer ";

    private final FirebaseAuth firebaseAuth;

    public FirebaseTokenAuthenticationFilter(FirebaseAuth firebaseAuth) {
        this.firebaseAuth = firebaseAuth;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authorizationHeader = request.getHeader("Authorization");
        if (authorizationHeader != null && authorizationHeader.startsWith(BEARER_PREFIX)) {
            String idToken = authorizationHeader.substring(BEARER_PREFIX.length());
            try {
                FirebaseToken token = firebaseAuth.verifyIdToken(idToken);
                FirebaseUserDetails principal = new FirebaseUserDetails(
                        token.getUid(), token.getEmail(), token.getName(), extractRoles(token));

                var authentication = new UsernamePasswordAuthenticationToken(
                        principal, null, toAuthorities(principal.roles()));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } catch (FirebaseAuthException | IllegalArgumentException e) {
                // IllegalArgumentException covers malformed/empty tokens, which
                // verifyIdToken throws synchronously rather than wrapping in a
                // FirebaseAuthException. Either way, treat the request as
                // unauthenticated and let the security filter chain decide.
                log.debug("Rejected invalid Firebase ID token: {}", e.getMessage());
            }
        }

        filterChain.doFilter(request, response);
    }

    private static Set<String> extractRoles(FirebaseToken token) {
        Object rawRoles = token.getClaims().get(FirebaseClaims.ROLES_CLAIM);
        Set<String> roles = new HashSet<>();
        if (rawRoles instanceof List<?> list) {
            for (Object role : list) {
                roles.add(String.valueOf(role));
            }
        } else if (rawRoles instanceof String role) {
            // FirebaseUserAdminService always writes "roles" as a collection,
            // but this claim can also be set manually (Firebase console/CLI,
            // e.g. to bootstrap the first ADMIN before the app can do it) as
            // a single string, so both shapes are accepted here.
            roles.add(role);
        }
        return roles;
    }

    private static Collection<GrantedAuthority> toAuthorities(Set<String> roles) {
        Set<GrantedAuthority> authorities = new HashSet<>();
        for (String role : roles) {
            authorities.add(new SimpleGrantedAuthority("ROLE_" + role.toUpperCase(Locale.ROOT)));
        }
        return authorities;
    }
}
