package com.ridesharehub.trip;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;

public interface TripRepository extends JpaRepository<Trip, Long> {

    List<Trip> findAllByCompany_Id(Long companyId);

    /**
     * Detects scheduling conflict for a vehicle: any active trip
     * overlapping the given departure window (±estimatedMinutes of route).
     * Simplified check: same vehicle, departure within ±24h, non-terminal status.
     */
    @Query("""
            SELECT COUNT(t) > 0 FROM Trip t
            WHERE t.vehicle.id = :vehicleId
              AND t.id <> :excludeTripId
              AND t.status NOT IN (com.ridesharehub.trip.TripStatus.COMPLETED,
                                   com.ridesharehub.trip.TripStatus.CANCELLED)
              AND t.departureTime BETWEEN :from AND :to
            """)
    boolean existsVehicleConflict(
            @Param("vehicleId") Long vehicleId,
            @Param("excludeTripId") Long excludeTripId,
            @Param("from") Instant from,
            @Param("to") Instant to);

    /**
     * Detects scheduling conflict for a driver.
     */
    @Query("""
            SELECT COUNT(t) > 0 FROM Trip t
            WHERE t.driver.id = :driverId
              AND t.id <> :excludeTripId
              AND t.status NOT IN (com.ridesharehub.trip.TripStatus.COMPLETED,
                                   com.ridesharehub.trip.TripStatus.CANCELLED)
              AND t.departureTime BETWEEN :from AND :to
            """)
    boolean existsDriverConflict(
            @Param("driverId") Long driverId,
            @Param("excludeTripId") Long excludeTripId,
            @Param("from") Instant from,
            @Param("to") Instant to);

    // ------------------------------------------------------------------ SP2-P1-01: Passenger search

    /**
     * Searches PUBLISHED trips visible to passengers.
     * Filters optionally by origin substring, destination substring,
     * departure-day window and minimum-seats threshold.
     *
     * availableSeats = vehicle.seatCapacity − confirmed bookings.
     * Until SP2-P2-01 (Booking) is implemented the booking sub-select
     * returns 0, so availableSeats equals full vehicle capacity.
     *
     * @param origin      case-insensitive substring, or null to skip
     * @param destination case-insensitive substring, or null to skip
     * @param from        start of day (inclusive), or null to skip
     * @param to          end of day (exclusive), or null to skip
     * @param minSeats    minimum available seats required (≥ 1)
     */
    @Query("""
            SELECT t FROM Trip t
              JOIN FETCH t.route r
              JOIN FETCH t.vehicle v
              JOIN FETCH t.driver d
              JOIN FETCH t.company c
            WHERE t.status = com.ridesharehub.trip.TripStatus.PUBLISHED
              AND (:origin IS NULL
                   OR LOWER(r.origin) LIKE LOWER(CONCAT('%', :origin, '%')))
              AND (:destination IS NULL
                   OR LOWER(r.destination) LIKE LOWER(CONCAT('%', :destination, '%')))
              AND (:from IS NULL OR t.departureTime >= :from)
              AND (:to   IS NULL OR t.departureTime <  :to)
            ORDER BY t.departureTime ASC
            """)
    List<Trip> searchPublished(
            @Param("origin")      String origin,
            @Param("destination") String destination,
            @Param("from")        Instant from,
            @Param("to")          Instant to,
            Pageable pageable);
}

