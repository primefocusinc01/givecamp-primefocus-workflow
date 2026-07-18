package org.primfocusinc.workflow.api.controller;

import org.primfocusinc.workflow.api.service.ParticipantService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class RestApiController {

    private final ParticipantService participantService;

    public RestApiController(ParticipantService participantService) {
        this.participantService = participantService;
    }

    @PostMapping("/registration")
    public ResponseEntity<Map<String, Object>> createParticipant( @PathVariable String id,
            @RequestBody Map<String, Object> body) throws Exception{

        body.forEach((key, value) -> {
            System.out.println(key + " = " + value);
        });

        participantService.save(body);

        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

}
