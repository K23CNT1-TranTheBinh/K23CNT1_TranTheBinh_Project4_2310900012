package com.eventticket.controller;

import com.eventticket.entity.Event;
import com.eventticket.repository.EventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.util.List;

@RestController
@RequestMapping("/api/public")
@CrossOrigin(origins = { "http://localhost:5500", "http://localhost:8000" })
public class PublicController {

    @Autowired
    private EventRepository eventRepository;

    @GetMapping("/events")
    public List<Event> getEvents(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return eventRepository.findAll(PageRequest.of(page, size)).getContent();
    }

    @GetMapping("/events/{id}")
    public Event getEvent(@PathVariable Long id) {
        return eventRepository.findById(id).orElse(null);
    }
}
