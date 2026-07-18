package org.primfocusinc.workflow.api.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.QueryDocumentSnapshot;
import com.google.cloud.firestore.QuerySnapshot;
import com.google.cloud.firestore.SetOptions;
import com.google.firebase.FirebaseApp;
import com.google.firebase.cloud.FirestoreClient;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@Service
public class FirestoreService {

    private final Firestore firestore;

    public FirestoreService(FirebaseApp firebaseApp) {
        this.firestore = FirestoreClient.getFirestore(firebaseApp);
    }

    public <T> void save(String collection, String documentId, T data)
            throws ExecutionException, InterruptedException {

        firestore.collection(collection)
                .document(documentId)
                .set(data)
                .get();
    }

    public <T> void update(String collection, String documentId, T data)
            throws ExecutionException, InterruptedException {

        firestore.collection(collection)
                .document(documentId)
                .set(data, SetOptions.merge())
                .get();
    }

    public Map<String, Object> findById(String collection, String documentId)
            throws ExecutionException, InterruptedException {

        DocumentSnapshot document = firestore.collection(collection)
                .document(documentId)
                .get()
                .get();

        if (!document.exists()) {
            return null;
        }

        Map<String, Object> data = new HashMap<>(document.getData());
        data.putIfAbsent("id", document.getId());
        return data;
    }

    public List<Map<String, Object>> findAll(String collection)
            throws ExecutionException, InterruptedException {
        QuerySnapshot querySnapshot = firestore.collection(collection)
                .get()
                .get();

        List<Map<String, Object>> result = new ArrayList<>();
        for (QueryDocumentSnapshot documentSnapshot : querySnapshot.getDocuments()) {
            Map<String, Object> data = new HashMap<>(documentSnapshot.getData());
            data.putIfAbsent("id", documentSnapshot.getId());
            result.add(data);
        }

        return result;
    }

    public void delete(String collection, String documentId)
            throws ExecutionException, InterruptedException {
        firestore.collection(collection)
                .document(documentId)
                .delete()
                .get();
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

    public <T> void postData(String document, T data) {
        DocumentReference docRef = this.firestore.document(document);
        docRef.set(data);
    }

    public void deleteData(String document) {
        DocumentReference docRef = this.firestore.document(document);
        docRef.delete();
    }
}