package com.ridesharehub.trip.repository;

import com.ridesharehub.trip.entity.RouteProposal;
import com.ridesharehub.trip.enums.RouteProposalStatus;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RouteProposalRepository extends JpaRepository<RouteProposal, Long> {

    @Query("""
            SELECT DISTINCT p FROM RouteProposal p
              LEFT JOIN FETCH p.stops s
              LEFT JOIN FETCH s.booking b
              LEFT JOIN FETCH b.passenger
            WHERE p.trip.id = :tripId
            ORDER BY p.createdAt DESC, p.id DESC
            """)
    List<RouteProposal> findAllByTripIdWithStops(@Param("tripId") Long tripId);

    @Query("""
            SELECT DISTINCT p FROM RouteProposal p
              LEFT JOIN FETCH p.stops s
              LEFT JOIN FETCH s.booking b
              LEFT JOIN FETCH b.passenger
            WHERE p.id = :proposalId AND p.trip.id = :tripId
            """)
    Optional<RouteProposal> findByIdAndTripIdWithStops(
            @Param("proposalId") Long proposalId,
            @Param("tripId") Long tripId);

    Optional<RouteProposal> findFirstByTrip_IdAndStatusOrderByReviewedAtDescIdDesc(
            Long tripId, RouteProposalStatus status);

    List<RouteProposal> findAllByTrip_IdAndStatusIn(
            Long tripId, List<RouteProposalStatus> statuses);
}
