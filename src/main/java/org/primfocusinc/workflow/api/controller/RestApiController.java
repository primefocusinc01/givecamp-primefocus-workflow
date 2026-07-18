package org.primfocusinc.workflow.api.controller;

import org.primfocusinc.workflow.api.model.Participant;
import org.primfocusinc.workflow.api.service.ParticipantService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController("/api")
public class RestApiController {

    @Autowired
    ParticipantService participantService;

    @GetMapping
    public List<Participant> getAllParticipant()  {
        return null;
    }

    @GetMapping("/{id}")
    public Participant getByParticipantId(@PathVariable String id) {
        return participantService.getParticipantById(id);
    }

    @PostMapping
    public void createIdParticipant(@RequestBody Participant participant) {
        participantService.createParticipant(participant);
    }

    @PutMapping("/{id}")
    public void updateParticipant(@PathVariable String id, @RequestBody Participant participant) {
        participantService.updateParticipant(id, participant);
    }

    @DeleteMapping("/{id}")
    public void deleteParticipant(@PathVariable String id) {
       ParticipantService.deleteParticipant(id);
    }
}
