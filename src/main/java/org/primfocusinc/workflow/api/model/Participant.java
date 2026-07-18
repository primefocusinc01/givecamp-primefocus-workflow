package org.primfocusinc.workflow.api.model;


import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Participant {

    private String id;
    private String name;
    private String lastName;
    private Date timeStamp;

}
