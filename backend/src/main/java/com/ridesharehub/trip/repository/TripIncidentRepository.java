package com.ridesharehub.trip.repository;

import com.ridesharehub.trip.entity.TripIncident;
import com.ridesharehub.trip.enums.TripIncidentStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TripIncidentRepository extends JpaRepository<TripIncident, Long> {

    @Query("""
            SELECT i FROM TripIncident i
              JOIN FETCH i.trip t
              JOIN FETCH t.route r
              JOIN FETCH t.company c
              JOIN FETCH t.vehicle v
              JOIN FETCH i.driver d
            WHERE t.id = :tripId
            ORDER BY i.createdAt DESC, i.id DESC
            """)
    List<TripIncident> findAllByTripIdWithDetails(@Param("tripId") Long tripId);

    @Query("""
            SELECT i FROM TripIncident i
              JOIN FETCH i.trip t
              JOIN FETCH t.route r
              JOIN FETCH t.company c
              JOIN FETCH t.vehicle v
              JOIN FETCH i.driver d
            WHERE c.id = :companyId
              AND (:status IS NULL OR i.status = :status)
            ORDER BY i.createdAt DESC, i.id DESC
            """)
    List<TripIncident> findAllByCompanyIdWithDetails(
            @Param("companyId") Long companyId,
            @Param("status") TripIncidentStatus status);

    @Query("""
            SELECT i FROM TripIncident i
              JOIN FETCH i.trip t
              JOIN FETCH t.route r
              JOIN FETCH t.company c
              JOIN FETCH t.vehicle v
              JOIN FETCH i.driver d
            WHERE (:status IS NULL OR i.status = :status)
            ORDER BY i.createdAt DESC, i.id DESC
            """)
    List<TripIncident> findAllWithDetails(@Param("status") TripIncidentStatus status);

    @Query("""
            SELECT i FROM TripIncident i
              JOIN FETCH i.trip t
              JOIN FETCH t.route r
              JOIN FETCH t.company c
              JOIN FETCH t.vehicle v
              JOIN FETCH i.driver d
            WHERE i.id = :incidentId AND t.id = :tripId
            """)
    Optional<TripIncident> findByIdAndTripIdWithDetails(
            @Param("incidentId") Long incidentId,
            @Param("tripId") Long tripId);

    long countByTrip_IdAndStatus(Long tripId, TripIncidentStatus status);
}
