package com.ridesharehub.rating.repository;

import com.ridesharehub.rating.entity.Rating;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RatingRepository extends JpaRepository<Rating, Long> {

    boolean existsByBooking_Id(Long bookingId);

    Optional<Rating> findByBooking_Id(Long bookingId);

    List<Rating> findAllByBooking_IdIn(Collection<Long> bookingIds);

    long countByCompany_Id(Long companyId);

    @Query("SELECT COALESCE(AVG(r.score), 0) FROM Rating r WHERE r.company.id = :companyId")
    Double averageScoreByCompanyId(@Param("companyId") Long companyId);

    @Query("SELECT COALESCE(AVG(r.score), 0) FROM Rating r")
    Double averageScoreOverall();

    @Query("""
            SELECT r FROM Rating r
              JOIN FETCH r.booking b
              JOIN FETCH r.trip t
              JOIN FETCH t.route rt
              JOIN FETCH r.company c
              JOIN FETCH r.driver d
              JOIN FETCH r.passenger p
            WHERE b.id = :bookingId
            """)
    Optional<Rating> findByBookingIdWithDetails(@Param("bookingId") Long bookingId);

    @Query("""
            SELECT r FROM Rating r
              JOIN FETCH r.booking b
              JOIN FETCH r.trip t
              JOIN FETCH t.route rt
              JOIN FETCH r.company c
              JOIN FETCH r.driver d
              JOIN FETCH r.passenger p
            WHERE c.id = :companyId
            ORDER BY r.createdAt DESC, r.id DESC
            """)
    List<Rating> findAllByCompanyIdWithDetails(@Param("companyId") Long companyId);

    @Query("""
            SELECT r FROM Rating r
              JOIN FETCH r.booking b
              JOIN FETCH r.trip t
              JOIN FETCH t.route rt
              JOIN FETCH r.company c
              JOIN FETCH r.driver d
              JOIN FETCH r.passenger p
            ORDER BY r.createdAt DESC, r.id DESC
            """)
    List<Rating> findAllWithDetailsOrderByCreatedAtDesc();
}
