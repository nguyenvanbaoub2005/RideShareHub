package com.ridesharehub.trip.repository;

import com.ridesharehub.trip.entity.TripStop;
import com.ridesharehub.trip.enums.TripStopType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripStopRepository extends JpaRepository<TripStop, Long> {

    @Query("""
            SELECT s FROM TripStop s
              JOIN FETCH s.booking b
              JOIN FETCH b.passenger p
            WHERE s.trip.id = :tripId
            ORDER BY s.stopOrder ASC, s.id ASC
            """)
    List<TripStop> findAllByTripIdWithBooking(@Param("tripId") Long tripId);

    @Query("""
            SELECT s FROM TripStop s
              JOIN FETCH s.booking b
              JOIN FETCH b.passenger p
              JOIN FETCH s.trip t
            WHERE s.id = :stopId
            """)
    Optional<TripStop> findByIdWithDetails(@Param("stopId") Long stopId);

    Optional<TripStop> findByBooking_IdAndStopType(Long bookingId, TripStopType stopType);
}
