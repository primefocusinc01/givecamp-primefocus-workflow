package org.primfocusinc.workflow.api.service;

import org.primfocusinc.workflow.firestore.FirestoreService;
import org.springframework.stereotype.Service;

@Service
public class ParticipantService {

    private final FirestoreService firestoreService;

    public ParticipantService(FirestoreService firestoreService) {
        this.firestoreService = firestoreService;
    }
}
