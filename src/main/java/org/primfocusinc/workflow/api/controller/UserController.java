package org.primfocusinc.workflow.api.controller;

import org.primfocusinc.workflow.api.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<Map<String, String>> create(@RequestBody Map<String, Object> body) throws Exception {
        String id = userService.create(body);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("id", id));
    }

    @GetMapping
    public ResponseEntity<List<Map<String, Object>>> findAll() throws Exception {
        return ResponseEntity.ok(userService.findAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> findById(@PathVariable String id) throws Exception {
        return ResponseEntity.ok(userService.findById(id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<Void> update(@PathVariable String id,
                                       @RequestBody Map<String, Object> body) throws Exception {
        userService.update(id, body);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) throws Exception {
        userService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
