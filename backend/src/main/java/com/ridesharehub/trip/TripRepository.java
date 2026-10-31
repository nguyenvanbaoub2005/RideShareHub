package com.ridesharehub.trip;

import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
}

