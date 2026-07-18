package org.primfocusinc.workflow.service;

import com.google.api.core.ApiFuture;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.annotation.PostConstruct;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

@Service
public class FirestoreService {

    private Firestore firestore;

    @Value("${google.credentialsJson}")
    private String credentialsJson;


    @PostConstruct
    void postInit() throws IOException {
        GoogleCredentials credentials = GoogleCredentials.fromStream(new ByteArrayInputStream(credentialsJson.getBytes()));
        FirebaseOptions options = new FirebaseOptions.Builder()
                .setCredentials(credentials)
                .build();
        FirebaseApp.initializeApp(options);

        firestore = FirestoreClient.getFirestore();
    }

    public <T> T getDocument(String document, Class<T> tClass) {
        DocumentReference docRef = this.firestore.document(document);
        ApiFuture<DocumentSnapshot> future = docRef.get();

        DocumentSnapshot documentSnapshot;
        try {
            documentSnapshot = future.get();
        } catch (Exception e) {
            throw new IllegalStateException("Could not retrieve data from Firestore", e);
        }

        return documentSnapshot.toObject(tClass);
    }

    public <T> List<T> getDocuments(String collection, Class<T> tClass)
            throws ExecutionException, InterruptedException {
        CollectionReference colRef = this.firestore.collection(collection);
        ApiFuture<QuerySnapshot> future = colRef.get();
        QuerySnapshot querySnapshot = future.get();

        List<T> result = new ArrayList<>();
        for (QueryDocumentSnapshot documentSnapshot : querySnapshot.getDocuments()) {
            T documentData = documentSnapshot.toObject(tClass);
            result.add(documentData);
        }

        return result;
    }

    public void postData(String document, Object data) {
        DocumentReference docRef = this.firestore.document(document);
        docRef.set(data);
    }

    public void deleteData(String document) {
        DocumentReference docRef = this.firestore.document(document);
        docRef.delete();
    }
}