package org.primfocusinc.workflow.api.error;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record ApiError(
        LocalDateTime timestamp,
        int status,
        String error,
        String message,
        String path)
{}