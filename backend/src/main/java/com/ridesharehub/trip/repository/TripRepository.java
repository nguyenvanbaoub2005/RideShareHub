package com.ridesharehub.trip.repository;

import com.ridesharehub.company.enums.CompanyStatus;
import com.ridesharehub.trip.entity.Trip;
import com.ridesharehub.trip.enums.TripStatus;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripRepository extends JpaRepository<Trip, Long> {

    List<Trip> findAllByCompany_Id(Long companyId);

    List<Trip> findAllByDriver_IdOrderByDepartureTimeAsc(Long driverId);

    /**
     * Acquires a row-level pessimistic write lock on the Trip row for
     * capacity-safe booking creation and cancellation (SP2-P2-02 / ADR-002).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT t FROM Trip t
              JOIN FETCH t.route r
              JOIN FETCH t.vehicle v
              JOIN FETCH t.driver d
              JOIN FETCH t.company c
            WHERE t.id = :tripId
            """)
    Optional<Trip> findByIdForUpdate(@Param("tripId") Long tripId);

    /**
     * Detects scheduling conflict for a vehicle: any active trip
     * overlapping the given departure window (±estimatedMinutes of route).
     * Simplified check: same vehicle, departure within ±24h, non-terminal status.
     */
    @Query("""
            SELECT COUNT(t) > 0 FROM Trip t
            WHERE t.vehicle.id = :vehicleId
              AND t.id <> :excludeTripId
              AND t.status <> :completedStatus
              AND t.status <> :cancelledStatus
              AND t.departureTime BETWEEN :from AND :to
            """)
    boolean existsVehicleConflictWithStatuses(
            @Param("vehicleId") Long vehicleId,
            @Param("excludeTripId") Long excludeTripId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("completedStatus") TripStatus completedStatus,
            @Param("cancelledStatus") TripStatus cancelledStatus);

    default boolean existsVehicleConflict(
            Long vehicleId,
            Long excludeTripId,
            Instant from,
            Instant to) {
        return existsVehicleConflictWithStatuses(
                vehicleId, excludeTripId, from, to,
                TripStatus.COMPLETED, TripStatus.CANCELLED);
    }

    /**
     * Detects scheduling conflict for a driver.
     */
    @Query("""
            SELECT COUNT(t) > 0 FROM Trip t
            WHERE t.driver.id = :driverId
              AND t.id <> :excludeTripId
              AND t.status <> :completedStatus
              AND t.status <> :cancelledStatus
              AND t.departureTime BETWEEN :from AND :to
            """)
    boolean existsDriverConflictWithStatuses(
            @Param("driverId") Long driverId,
            @Param("excludeTripId") Long excludeTripId,
            @Param("from") Instant from,
            @Param("to") Instant to,
            @Param("completedStatus") TripStatus completedStatus,
            @Param("cancelledStatus") TripStatus cancelledStatus);

    default boolean existsDriverConflict(
            Long driverId,
            Long excludeTripId,
            Instant from,
            Instant to) {
        return existsDriverConflictWithStatuses(
                driverId, excludeTripId, from, to,
                TripStatus.COMPLETED, TripStatus.CANCELLED);
    }

    // ------------------------------------------------------------------ SP2-P1-01: Passenger search

    @Query("""
            SELECT t FROM Trip t
              JOIN FETCH t.route r
              JOIN FETCH t.vehicle v
              JOIN FETCH t.driver d
              JOIN FETCH t.company c
            WHERE t.status = :status
              AND c.status = :approvedStatus
              AND LOWER(r.origin) LIKE LOWER(CONCAT('%', :origin, '%'))
              AND LOWER(r.destination) LIKE LOWER(CONCAT('%', :destination, '%'))
              AND t.departureTime >= :from
              AND t.departureTime <  :to
            ORDER BY t.departureTime ASC
            """)
    List<Trip> searchByStatus(
            @Param("status")         TripStatus status,
            @Param("approvedStatus") CompanyStatus approvedStatus,
            @Param("origin")         String origin,
            @Param("destination")    String destination,
            @Param("from")           Instant from,
            @Param("to")             Instant to,
            Pageable pageable);

    /**
     * Searches PUBLISHED trips visible to passengers.
     * Filters optionally by origin substring, destination substring,
     * departure-day window and minimum-seats threshold.
     *
     * availableSeats = vehicle.seatCapacity − trip.bookedSeats.
     *
     * @param origin      case-insensitive substring, or null to skip
     * @param destination case-insensitive substring, or null to skip
     * @param from        start of day (inclusive), or null to skip
     * @param to          end of day (exclusive), or null to skip
     */
    default List<Trip> searchPublished(
            String origin,
            String destination,
            Instant from,
            Instant to,
            Pageable pageable) {
        return searchByStatus(
                TripStatus.PUBLISHED,
                CompanyStatus.APPROVED,
                origin != null ? origin : "",
                destination != null ? destination : "",
                from != null ? from : Instant.EPOCH,
                to != null ? to : Instant.parse("2100-01-01T00:00:00Z"),
                pageable);
    }

    // ------------------------------------------------------------------ SP4-P2-02: Monitoring queries

    @Query("""
            SELECT t FROM Trip t
              JOIN FETCH t.route r
              JOIN FETCH t.vehicle v
              JOIN FETCH t.driver d
              JOIN FETCH t.company c
            ORDER BY t.departureTime DESC, t.id DESC
            """)
    List<Trip> findAllWithDetailsOrderByDepartureTimeDesc();

    @Query("""
            SELECT t FROM Trip t
              JOIN FETCH t.route r
              JOIN FETCH t.vehicle v
              JOIN FETCH t.driver d
              JOIN FETCH t.company c
            WHERE c.id = :companyId
            ORDER BY t.departureTime DESC, t.id DESC
            """)
    List<Trip> findAllByCompanyIdWithDetailsOrderByDepartureTimeDesc(@Param("companyId") Long companyId);
}
