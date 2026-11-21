package com.ridesharehub.admin.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * SP4-P1-01: Operational overview KPIs for Admin Dashboard (AD-02).
 */
public record AdminOverviewResponse(
        long totalCompanies,
        long pendingCompanies,
        long approvedCompanies,
        long rejectedCompanies,
        long totalUsers,
        long passengerCount,
        long driverUserCount,
        long companyOwnerCount,
        long adminCount,
        long lockedUsersCount,
        long totalDrivers,
        long availableDrivers,
        long onTripDrivers,
        long inactiveDrivers,
        long totalTrips,
        long activeTrips,
        long upcomingTrips,
        long completedTrips,
        long cancelledTrips,
        long draftTrips,
        long totalBookings,
        long confirmedBookings,
        long pickedUpBookings,
        long completedBookings,
        long cancelledBookings,
        long noShowBookings,
        long totalRatings,
        BigDecimal averageRating,
        long openIncidentsCount,
        List<PendingCompanyItem> pendingCompanyList,
        List<RecentRatingItem> recentRatings) {

    public record PendingCompanyItem(
            Long id,
            String name,
            String representativeName,
            String contactPhone,
            String contactEmail,
            String address,
            Instant createdAt) {
    }

    public record RecentRatingItem(
            Long id,
            String bookingCode,
            String companyName,
            String driverName,
            String passengerName,
            int score,
            String comment,
            Instant createdAt) {
    }
}
