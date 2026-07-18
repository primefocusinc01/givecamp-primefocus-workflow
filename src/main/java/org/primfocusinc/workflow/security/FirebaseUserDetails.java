package org.primfocusinc.workflow.security;

import java.util.Set;

/**
 * Authenticated principal populated from a verified Firebase ID token.
 *
 * @param uid    Firebase user id (stable identifier for the signed-in user).
 * @param email  Email address associated with the Firebase account.
 * @param name   Display name, if set on the Firebase account.
 * @param roles  Role names (without the {@code ROLE_} prefix) taken from the
 *               token's {@code roles} custom claim.
 */
public record FirebaseUserDetails(String uid, String email, String name, Set<String> roles) {
}
