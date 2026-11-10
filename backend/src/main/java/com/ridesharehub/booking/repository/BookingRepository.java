package com.ridesharehub.booking.repository;

import com.ridesharehub.booking.entity.Booking;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    @Query("""
            SELECT b FROM Booking b
              JOIN FETCH b.passenger p
              JOIN FETCH b.trip t
              JOIN FETCH t.route r
              JOIN FETCH t.company c
              JOIN FETCH t.vehicle v
              JOIN FETCH t.driver d
            WHERE b.passenger.id = :passengerId
              AND b.idempotencyKey = :idempotencyKey
            """)
    Optional<Booking> findByPassenger_IdAndIdempotencyKey(
            @Param("passengerId") Long passengerId,
            @Param("idempotencyKey") String idempotencyKey);

    @Query("""
            SELECT b FROM Booking b
              JOIN FETCH b.passenger p
              JOIN FETCH b.trip t
              JOIN FETCH t.route r
              JOIN FETCH t.company c
              JOIN FETCH t.vehicle v
              JOIN FETCH t.driver d
            WHERE b.id = :bookingId
            """)
    Optional<Booking> findByIdWithDetails(@Param("bookingId") Long bookingId);

    @Query("""
            SELECT b FROM Booking b
              JOIN FETCH b.passenger p
              JOIN FETCH b.trip t
              JOIN FETCH t.route r
              JOIN FETCH t.company c
              JOIN FETCH t.vehicle v
              JOIN FETCH t.driver d
            WHERE b.passenger.id = :passengerId
            ORDER BY b.createdAt DESC
            """)
    List<Booking> findAllByPassenger_IdOrderByCreatedAtDesc(@Param("passengerId") Long passengerId);

    @Query("""
            SELECT b FROM Booking b
              JOIN FETCH b.passenger p
              JOIN FETCH b.trip t
              JOIN FETCH t.route r
              JOIN FETCH t.company c
              JOIN FETCH t.vehicle v
              JOIN FETCH t.driver d
            WHERE b.trip.id = :tripId
            ORDER BY b.createdAt ASC
            """)
    List<Booking> findAllByTrip_IdOrderByCreatedAtAsc(@Param("tripId") Long tripId);
}

