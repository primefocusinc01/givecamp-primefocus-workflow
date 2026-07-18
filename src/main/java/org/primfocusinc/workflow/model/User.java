package org.primfocusinc.workflow.model;

import lombok.Data;

@Data
public class User {
    private String userId;
    private String hashedPassword;
    private String name;
}
