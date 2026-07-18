package org.primfocusinc.workflow.api.service;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import org.primfocusinc.workflow.security.FirebaseClaims;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

/**
 * Administrative operations against Firebase Authentication itself (as
 * opposed to {@code UserService}, which manages app-level profile documents
 * in Firestore). Used to assign the {@code roles} custom claim that
 * {@link org.primfocusinc.workflow.security.FirebaseTokenAuthenticationFilter}
 * reads out of each verified ID token.
 */
@Service
public class FirebaseUserAdminService {

    /** Role names accepted by {@link #setRoles}. */
    public static final Set<String> ALLOWED_ROLES = Set.of("ADMIN", "USER");

    private final FirebaseAuth firebaseAuth;

    public FirebaseUserAdminService(FirebaseAuth firebaseAuth) {
        this.firebaseAuth = firebaseAuth;
    }

    /**
     * Sets the {@code roles} custom claim on the given Firebase user.
     * <p>
     * {@code setCustomUserClaims} overwrites the entire custom claims map,
     * so any existing claims are fetched first and merged with the new
     * {@code roles} value to avoid clobbering claims set elsewhere.
     */
    public void setRoles(String uid, Set<String> roles) throws FirebaseAuthException {
        UserRecord user = firebaseAuth.getUser(uid);
        Map<String, Object> claims = user.getCustomClaims() != null
                ? new HashMap<>(user.getCustomClaims())
                : new HashMap<>();
        claims.put(FirebaseClaims.ROLES_CLAIM, roles);
        firebaseAuth.setCustomUserClaims(uid, claims);
    }
}
