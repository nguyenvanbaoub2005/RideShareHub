package com.ridesharehub.rating.service;

import com.ridesharehub.auth.enums.UserRole;
import com.ridesharehub.booking.entity.Booking;
import com.ridesharehub.booking.enums.BookingStatus;
import com.ridesharehub.booking.repository.BookingRepository;
import com.ridesharehub.company.entity.TransportCompany;
import com.ridesharehub.company.repository.CompanyRepository;
import com.ridesharehub.rating.dto.CreateRatingRequest;
import com.ridesharehub.rating.dto.RatingResponse;
import com.ridesharehub.rating.entity.Rating;
import com.ridesharehub.rating.repository.RatingRepository;
import com.ridesharehub.security.AuthPrincipal;
import com.ridesharehub.trip.enums.TripStatus;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * SP4-P1-01: Passenger rating creation and company aggregate score update.
 */
@Service
@Transactional
public class RatingService {

    private static final int MAX_COMMENT_LENGTH = 500;

    private final RatingRepository ratingRepository;
    private final BookingRepository bookingRepository;
    private final CompanyRepository companyRepository;

    public RatingService(
            RatingRepository ratingRepository,
            BookingRepository bookingRepository,
            CompanyRepository companyRepository) {
        this.ratingRepository = ratingRepository;
        this.bookingRepository = bookingRepository;
        this.companyRepository = companyRepository;
    }

    public RatingResponse createRating(
            Long bookingId,
            CreateRatingRequest req,
            AuthPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        if (principal.role() != UserRole.PASSENGER) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Chỉ hành khách mới có thể đánh giá chuyến đi.");
        }
        if (req == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_CONTENT, "Vui lòng chọn số sao đánh giá (1–5).");
        }

        Booking booking = bookingRepository.findByIdWithDetails(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt chỗ"));

        if (!booking.getPassenger().getId().equals(principal.userId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Bạn không có quyền đánh giá đặt chỗ của người khác.");
        }
        if (booking.getStatus() != BookingStatus.COMPLETED
                || booking.getTrip().getStatus() != TripStatus.COMPLETED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Chỉ có thể đánh giá sau khi chuyến đi đã hoàn thành.");
        }
        if (ratingRepository.existsByBooking_Id(bookingId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "Bạn đã đánh giá chuyến đi này rồi.");
        }

        ResolvedScores scores = resolveAndValidateScores(req);
        String comment = normalizeComment(req.comment());

        TransportCompany company = booking.getTrip().getCompany();
        Rating rating = new Rating(
                booking,
                booking.getTrip(),
                company,
                booking.getTrip().getDriver(),
                booking.getPassenger(),
                scores.overall(),
                scores.tripScore(),
                scores.driverScore(),
                scores.companyScore(),
                comment);

        Rating saved = ratingRepository.saveAndFlush(rating);

        long count = ratingRepository.countByCompany_Id(company.getId());
        Double avg = ratingRepository.averageScoreByCompanyId(company.getId());
        BigDecimal avgBd = avg == null
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP);
        company.updateRatingSummary(avgBd, (int) count);
        companyRepository.save(company);

        return RatingResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public RatingResponse getBookingRating(Long bookingId, AuthPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        Booking booking = bookingRepository.findByIdWithDetails(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy đặt chỗ"));

        boolean isPassengerOwner = booking.getPassenger().getId().equals(principal.userId());
        boolean isCompanyOwner = booking.getTrip().getCompany().getOwner().getId().equals(principal.userId());
        boolean isAdmin = principal.role() == UserRole.ADMIN;
        if (!isPassengerOwner && !isCompanyOwner && !isAdmin) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Không có quyền xem đánh giá của đặt chỗ này.");
        }

        Rating rating = ratingRepository.findByBookingIdWithDetails(bookingId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Đặt chỗ này chưa có đánh giá"));
        return RatingResponse.from(rating);
    }

    @Transactional(readOnly = true)
    public List<RatingResponse> listCompanyRatings(Long companyId, AuthPrincipal principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthenticated");
        }
        if (!companyRepository.existsById(companyId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy nhà xe");
        }
        return ratingRepository.findAllByCompanyIdWithDetails(companyId)
                .stream()
                .map(RatingResponse::from)
                .toList();
    }

    private record ResolvedScores(int overall, int tripScore, int driverScore, int companyScore) {
    }

    private static ResolvedScores resolveAndValidateScores(CreateRatingRequest req) {
        validateOptionalStar(req.score(), "overall score");
        validateOptionalStar(req.tripScore(), "tripScore");
        validateOptionalStar(req.driverScore(), "driverScore");
        validateOptionalStar(req.companyScore(), "companyScore");

        if (req.tripScore() != null && req.driverScore() != null && req.companyScore() != null) {
            int overall = req.score() != null
                    ? req.score()
                    : (int) Math.round((req.tripScore() + req.driverScore() + req.companyScore()) / 3.0);
            return new ResolvedScores(overall, req.tripScore(), req.driverScore(), req.companyScore());
        }

        if (req.score() == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_CONTENT,
                    "Vui lòng chọn số sao đánh giá (1–5) trước khi gửi.");
        }
        int base = req.score();
        return new ResolvedScores(
                base,
                req.tripScore() != null ? req.tripScore() : base,
                req.driverScore() != null ? req.driverScore() : base,
                req.companyScore() != null ? req.companyScore() : base);
    }

    private static void validateOptionalStar(Integer value, String fieldName) {
        if (value != null && (value < 1 || value > 5)) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_CONTENT,
                    "Invalid " + fieldName + ": must be between 1 and 5");
        }
    }

    private static String normalizeComment(String comment) {
        if (comment == null) {
            return null;
        }
        String trimmed = comment.strip();
        if (trimmed.isEmpty()) {
            return null;
        }
        if (trimmed.length() > MAX_COMMENT_LENGTH) {
            throw new ResponseStatusException(
                    HttpStatus.UNPROCESSABLE_CONTENT,
                    "Nhận xét không được vượt quá " + MAX_COMMENT_LENGTH + " ký tự.");
        }
        return trimmed;
    }
}
