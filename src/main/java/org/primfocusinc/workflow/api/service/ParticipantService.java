package org.primfocusinc.workflow.api.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.CollectionReference;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.WriteResult;
import org.primfocusinc.workflow.firestore.FirestoreService;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;

@Service
public class ParticipantService {

    private final FirestoreService firestoreService;

    public ParticipantService(FirestoreService firestoreService) {
        this.firestoreService = firestoreService;
    }

    public void save(String verifyId,Map<String, Object> body) throws Exception {

        String id = UUID.randomUUID().toString();

        firestoreService.save("participants",id,body);
    }
}
