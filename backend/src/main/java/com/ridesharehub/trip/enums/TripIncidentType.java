package com.ridesharehub.trip.enums;

/**
 * SP4-P2-01: Incident categories matching Figma DR-09 (IncidentReport).
 */
public enum TripIncidentType {
    VEHICLE_ISSUE("Sự cố phương tiện"),
    TRAFFIC_ACCIDENT("Tai nạn giao thông"),
    HEAVY_TRAFFIC("Kẹt xe kéo dài"),
    PASSENGER_NO_SHOW("Hành khách không có mặt"),
    SAFETY_CONCERN("Vấn đề an toàn"),
    OTHER("Sự cố khác");

    private final String labelVi;

    TripIncidentType(String labelVi) {
        this.labelVi = labelVi;
    }

    public String getLabelVi() {
        return labelVi;
    }
}
