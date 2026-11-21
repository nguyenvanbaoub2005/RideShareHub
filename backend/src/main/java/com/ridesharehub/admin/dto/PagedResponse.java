package com.ridesharehub.admin.dto;

import java.util.List;

/**
 * SP4-P1-01: Standard paginated response envelope for Admin read-only directories.
 */
public record PagedResponse<T>(
        List<T> items,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean hasNext,
        boolean hasPrevious) {

    public static <T> PagedResponse<T> of(List<T> allMatching, int requestedPage, int requestedSize) {
        int safeSize = Math.min(100, Math.max(1, requestedSize));
        long total = allMatching.size();
        int totalPages = total == 0 ? 1 : (int) Math.ceil((double) total / safeSize);
        int safePage = Math.max(0, Math.min(requestedPage, totalPages - 1));
        int fromIndex = (int) Math.min((long) safePage * safeSize, total);
        int toIndex = (int) Math.min((long) fromIndex + safeSize, total);
        List<T> slice = allMatching.subList(fromIndex, toIndex);
        return new PagedResponse<>(
                slice,
                safePage,
                safeSize,
                total,
                totalPages,
                safePage + 1 < totalPages,
                safePage > 0);
    }
}
