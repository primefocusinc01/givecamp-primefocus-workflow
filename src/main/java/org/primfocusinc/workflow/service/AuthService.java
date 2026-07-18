package org.primfocusinc.workflow.service;

import lombok.SneakyThrows;
import lombok.val;
import org.primfocusinc.workflow.model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;

@Service
public class AuthService {

    @Autowired
    FirestoreService firestoreService;

    @SneakyThrows
    public boolean validate(String username, String password) {
        val user = firestoreService.getDocument("users/" + username, User.class);
        if (user == null) {
            return false;
        }
        val sha = MessageDigest.getInstance("SHA-256").digest(password.getBytes());
        val hashedPassword = new String(sha);
        return user.getHashedPassword().equalsIgnoreCase(hashedPassword);
    }


    @SneakyThrows
    public boolean changePassword(String username, String password) {
        val user = firestoreService.getDocument("users/" + username, User.class);
        if (user == null) {
            return false;
        }
        val sha = MessageDigest.getInstance("SHA-256").digest(password.getBytes());
        val hashedPassword = new String(sha);
        user.setHashedPassword(hashedPassword);
        firestoreService.postData("users/" + username, user);
        return true;
    }

    public User getUser(String username) {

        val user = firestoreService.getDocument("users/" + username, User.class);
        return user;
    }
}
