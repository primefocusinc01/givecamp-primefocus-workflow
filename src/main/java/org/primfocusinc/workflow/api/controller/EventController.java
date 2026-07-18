package org.primfocusinc.workflow.api.controller;

import org.primfocusinc.workflow.api.service.EventService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/event")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createdEvent(@PathVariable String id,
                                                            @RequestBody Map<String,Object> body) throws Exception{
        eventService.save(id,body);
        return ResponseEntity.status(HttpStatus.CREATED);
    }
}
