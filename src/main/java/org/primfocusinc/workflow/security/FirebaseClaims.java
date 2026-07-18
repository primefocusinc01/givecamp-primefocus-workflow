package org.primfocusinc.workflow.security;

/**
 * Names of the custom claims this application reads/writes on Firebase ID
 * tokens. Shared between {@link FirebaseTokenAuthenticationFilter} (reads)
 * and {@code FirebaseUserAdminService} (writes) so both stay in sync.
 */
public final class FirebaseClaims {

    public static final String ROLES_CLAIM = "roles";

    private FirebaseClaims() {
    }
}
