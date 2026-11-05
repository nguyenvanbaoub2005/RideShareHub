package com.ridesharehub.trip;

import java.time.LocalDate;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * SP2-P1-01: Public Trip search endpoint for authenticated passengers.
 * SP2-P1-02: Includes estimated fare in each result.
 *
 * GET /api/trips/search
 *   ?origin=...          (optional, substring, case-insensitive)
 *   &destination=...     (optional, substring, case-insensitive)
 *   &date=YYYY-MM-DD     (optional, filters by departure calendar day UTC)
 *   &minSeats=N          (optional, default 1)
 */
@RestController
@RequestMapping("/api/trips")
public class TripSearchController {

    private final TripSearchService tripSearchService;

    public TripSearchController(TripSearchService tripSearchService) {
        this.tripSearchService = tripSearchService;
    }

    @GetMapping("/search")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TripSearchResult>> search(
            @RequestParam(required = false) String origin,
            @RequestParam(required = false) String destination,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) Integer minSeats) {

        TripSearchRequest request = new TripSearchRequest(origin, destination, date, minSeats);
        List<TripSearchResult> results = tripSearchService.search(request);
        return ResponseEntity.ok(results);
    }
}

