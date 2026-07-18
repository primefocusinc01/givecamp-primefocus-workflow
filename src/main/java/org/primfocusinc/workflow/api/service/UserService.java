package org.primfocusinc.workflow.api.service;

import org.primfocusinc.workflow.firestore.FirestoreService;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class UserService {

    private final FirestoreService firestoreService;

    public UserService(FirestoreService firestoreService) {
        this.firestoreService = firestoreService;
    }

    public void saveUser(String id,  Map<String, Object> body){

    }

}
