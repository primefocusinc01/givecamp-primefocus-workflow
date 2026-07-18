package org.primfocusinc.workflow.api.error;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.time.LocalDateTime;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity handleNotFound(
            ResourceNotFoundException ex,
            HttpServletRequest request
    ){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity handleGeneral(
            Exception ex,
            HttpServletRequest request ){
        ApiError error = new ApiError(
                LocalDateTime.now(),
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Internal Error",
                ex.getMessage(),
                request.getRequestURI()
        );

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }

    public ResponseEntity handleValidation(MethodArgumentNotValidException ex,
                                           HttpServletRequest request){

        String msg = ex.getBindingResult()
                .getAllErrors()
                .get(0)
                .getDefaultMessage();

        ApiError error = new ApiError(
                LocalDateTime.now(),
                400,
                "Validation Failed",
                msg,
                request.getRequestURI()
        );
        return ResponseEntity.badRequest().body(error);
    }
}