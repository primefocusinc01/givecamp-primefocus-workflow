package org.primfocusinc.workflow.api.controller;

import com.google.firebase.auth.FirebaseAuthException;
import org.primfocusinc.workflow.api.service.FirebaseUserAdminService;
import org.primfocusinc.workflow.security.FirebaseUserDetails;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

/**
 * Exposes the identity of the currently signed-in Firebase user so the
 * frontend can bootstrap session state after sign-in, and lets admins assign
 * roles to the small, fixed set of named Firebase users.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final FirebaseUserAdminService firebaseUserAdminService;

    public AuthController(FirebaseUserAdminService firebaseUserAdminService) {
        this.firebaseUserAdminService = firebaseUserAdminService;
    }

    @GetMapping("/me")
    public ResponseEntity<FirebaseUserDetails> me(@AuthenticationPrincipal FirebaseUserDetails principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(principal);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/users/{uid}/roles")
    public ResponseEntity<Void> setRoles(@PathVariable String uid, @RequestBody Set<String> roles)
            throws FirebaseAuthException {
        if (roles == null || roles.isEmpty() || !FirebaseUserAdminService.ALLOWED_ROLES.containsAll(roles)) {
            return ResponseEntity.badRequest().build();
        }
        firebaseUserAdminService.setRoles(uid, roles);
        return ResponseEntity.noContent().build();
    }
}
