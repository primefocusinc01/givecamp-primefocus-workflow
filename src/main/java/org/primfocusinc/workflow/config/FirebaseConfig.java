package org.primfocusinc.workflow.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.auth.FirebaseAuth;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.List;

/**
 * Single source of truth for the Firebase Admin SDK {@link FirebaseApp}.
 * <p>
 * Both Firestore access and Firebase Authentication (ID token verification,
 * user/custom-claim management) share the same service account credential,
 * so the app is initialized once here rather than by each consuming service.
 */
@Configuration
public class FirebaseConfig {

    @Value("${google.credentialsJson}")
    private String credentialsJson;

    @Bean
    FirebaseApp firebaseApp() throws IOException {
        // FirebaseApp's registry is a JVM-global static, not scoped to this
        // Spring ApplicationContext, so this guard isn't redundant with
        // Spring's own singleton-bean handling: it protects against
        // FirebaseApp.initializeApp() throwing "already exists" when more
        // than one ApplicationContext is created in the same JVM (e.g. a
        // test suite with multiple @SpringBootTest classes). This assumes
        // every context in the JVM uses the same google.credentialsJson,
        // which holds today since there's a single, fixed service account.
        List<FirebaseApp> existing = FirebaseApp.getApps();
        if (!existing.isEmpty()) {
            return existing.get(0);
        }

        GoogleCredentials credentials = GoogleCredentials.fromStream(new ByteArrayInputStream(credentialsJson.getBytes()));
        FirebaseOptions options = new FirebaseOptions.Builder()
                .setCredentials(credentials)
                .build();
        return FirebaseApp.initializeApp(options);
    }

    @Bean
    FirebaseAuth firebaseAuth(FirebaseApp firebaseApp) {
        return FirebaseAuth.getInstance(firebaseApp);
    }
}
