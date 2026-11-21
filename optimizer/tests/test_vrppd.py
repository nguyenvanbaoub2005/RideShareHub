from fastapi.testclient import TestClient

from optimizer.main import app

client = TestClient(app)


def test_empty_bookings_returns_zero_distance() -> None:
    response = client.post(
        "/optimize/trip-route",
        json={
            "trip_id": 10,
            "vehicle_capacity": 7,
            "bookings": [],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["trip_id"] == 10
    assert body["total_distance_km"] == 0.0
    assert body["ordered_stops"] == []
    assert body["max_seats_on_board"] == 0


def test_multi_booking_precedence_and_distance_optimization() -> None:
    """
    Route from Da Nang (south-east) toward Hue (north-west) with 3 bookings
    arranged out-of-order geographically in input so naive baseline backtracks heavily.
    """
    payload = {
        "trip_id": 101,
        "vehicle_capacity": 7,
        "start_point": {"label": "Bến xe Đà Nẵng", "latitude": 16.0544, "longitude": 108.1715},
        "end_point": {"label": "Bến xe phía Nam Huế", "latitude": 16.4530, "longitude": 107.6060},
        "bookings": [
            # Booking 1: Pickup far north (Lăng Cô), Dropoff Huế
            {
                "booking_id": 1,
                "seat_count": 2,
                "pickup": {"label": "Lăng Cô", "latitude": 16.2370, "longitude": 108.0810},
                "dropoff": {"label": "15 Hùng Vương, Huế", "latitude": 16.4637, "longitude": 107.5909},
            },
            # Booking 2: Pickup in central Da Nang, Dropoff early in Lăng Cô
            {
                "booking_id": 2,
                "seat_count": 1,
                "pickup": {"label": "24 Lê Duẩn, Đà Nẵng", "latitude": 16.0680, "longitude": 108.2210},
                "dropoff": {"label": "Thị trấn Lăng Cô", "latitude": 16.2350, "longitude": 108.0840},
            },
            # Booking 3: Pickup Hải Châu, Dropoff Phú Lộc
            {
                "booking_id": 3,
                "seat_count": 2,
                "pickup": {"label": "Cầu Rồng, Đà Nẵng", "latitude": 16.0610, "longitude": 108.2270},
                "dropoff": {"label": "Phú Lộc, Huế", "latitude": 16.2780, "longitude": 107.8820},
            },
        ],
    }

    response = client.post("/optimize/trip-route", json=payload)
    assert response.status_code == 200
    body = response.json()

    stops = body["ordered_stops"]
    assert len(stops) == 6
    assert body["total_distance_km"] <= body["baseline_distance_km"]
    assert body["distance_saved_km"] >= 0.0
    assert body["max_seats_on_board"] <= 7

    # Hard Precedence check: PICKUP before DROPOFF for every booking
    seen_pickups: set[int] = set()
    for idx, stop in enumerate(stops, start=1):
        assert stop["stop_order"] == idx
        assert 0 <= stop["cumulative_seats_on_board"] <= 7
        if stop["stop_type"] == "PICKUP":
            seen_pickups.add(stop["booking_id"])
        else:
            assert stop["booking_id"] in seen_pickups


def test_tight_vehicle_capacity_forces_dropoff_before_next_pickup() -> None:
    """
    Vehicle capacity = 2 seats.
    Two bookings each require 2 seats -> vehicle CANNOT hold both bookings simultaneously.
    Therefore the solver MUST drop off one booking before picking up the second.
    """
    payload = {
        "trip_id": 202,
        "vehicle_capacity": 2,
        "start_point": {"label": "Đà Nẵng", "latitude": 16.0544, "longitude": 108.2022},
        "bookings": [
            {
                "booking_id": 11,
                "seat_count": 2,
                "pickup": {"label": "Đà Nẵng A", "latitude": 16.0600, "longitude": 108.2100},
                "dropoff": {"label": "Hội An A", "latitude": 15.8801, "longitude": 108.3380},
            },
            {
                "booking_id": 12,
                "seat_count": 2,
                "pickup": {"label": "Đà Nẵng B", "latitude": 16.0650, "longitude": 108.2150},
                "dropoff": {"label": "Tam Kỳ B", "latitude": 15.5736, "longitude": 108.4740},
            },
        ],
    }

    response = client.post("/optimize/trip-route", json=payload)
    assert response.status_code == 200
    body = response.json()
    stops = body["ordered_stops"]
    assert len(stops) == 4
    assert body["max_seats_on_board"] == 2
    # Must be PICKUP -> DROPOFF -> PICKUP -> DROPOFF
    assert [s["stop_type"] for s in stops] == ["PICKUP", "DROPOFF", "PICKUP", "DROPOFF"]
    assert stops[0]["booking_id"] == stops[1]["booking_id"]
    assert stops[2]["booking_id"] == stops[3]["booking_id"]


def test_booking_exceeding_capacity_returns_422() -> None:
    payload = {
        "trip_id": 303,
        "vehicle_capacity": 4,
        "bookings": [
            {
                "booking_id": 99,
                "seat_count": 5,
                "pickup": {"label": "A", "latitude": 16.05, "longitude": 108.20},
                "dropoff": {"label": "B", "latitude": 16.46, "longitude": 107.59},
            }
        ],
    }

    response = client.post("/optimize/trip-route", json=payload)
    assert response.status_code == 422
    assert "exceeding vehicle capacity" in response.json()["detail"]
