package org.primfocusinc.workflow.firestore;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;

public class FirestoreManager {

  private static Firestore db;

  public static Firestore getInstance() throws IOException {
    if (db == null) {
      initializeFirestore();
    }
    return db;
  }

  private static void initializeFirestore() throws IOException {
    InputStream serviceAccount = new FileInputStream(
        "src/main/resources/static/serviceAccountKey.json"); //need to change for some Cloud Variable

    GoogleCredentials credentials = GoogleCredentials.fromStream(serviceAccount);
    FirebaseOptions options = new FirebaseOptions.Builder()
        .setCredentials(credentials)
        .build();
    FirebaseApp.initializeApp(options);

    db = FirestoreClient.getFirestore();
  }
}