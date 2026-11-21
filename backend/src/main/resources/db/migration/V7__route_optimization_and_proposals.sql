-- SP3-P1-01, SP3-P1-03, SP3-P1-05: Route optimization proposals & planned stop arrival metadata

CREATE TABLE route_proposals (
    id                      BIGSERIAL       PRIMARY KEY,
    trip_id                 BIGINT          NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PROPOSED',
    solver_engine           VARCHAR(64)     NOT NULL,
    solver_status           VARCHAR(32)     NOT NULL DEFAULT 'OPTIMAL',
    total_distance_km       NUMERIC(10, 2)  NOT NULL DEFAULT 0,
    baseline_distance_km    NUMERIC(10, 2)  NOT NULL DEFAULT 0,
    distance_saved_km       NUMERIC(10, 2)  NOT NULL DEFAULT 0,
    total_duration_minutes  INT             NOT NULL DEFAULT 0,
    max_seats_on_board      INT             NOT NULL DEFAULT 0,
    vehicle_capacity        INT             NOT NULL DEFAULT 1,
    reject_reason           VARCHAR(500)    NULL,
    created_by_user_id      BIGINT          NULL,
    reviewed_by_user_id     BIGINT          NULL,
    reviewed_at             TIMESTAMPTZ     NULL,
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_route_proposals_trip_status ON route_proposals(trip_id, status);

CREATE TABLE route_proposal_stops (
    id                          BIGSERIAL       PRIMARY KEY,
    proposal_id                 BIGINT          NOT NULL REFERENCES route_proposals(id) ON DELETE CASCADE,
    booking_id                  BIGINT          NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    stop_type                   VARCHAR(20)     NOT NULL,
    stop_order                  INT             NOT NULL,
    address                     VARCHAR(500)    NOT NULL,
    latitude                    NUMERIC(10, 7)  NULL,
    longitude                   NUMERIC(10, 7)  NULL,
    seat_delta                  INT             NOT NULL DEFAULT 0,
    cumulative_seats_on_board   INT             NOT NULL DEFAULT 0,
    distance_from_prev_km       NUMERIC(10, 2)  NOT NULL DEFAULT 0,
    eta_offset_minutes          INT             NOT NULL DEFAULT 0,
    planned_arrival_at          TIMESTAMPTZ     NULL
);

CREATE INDEX idx_route_proposal_stops_proposal_order
    ON route_proposal_stops(proposal_id, stop_order);

ALTER TABLE trip_stops
    ADD COLUMN IF NOT EXISTS planned_arrival_at TIMESTAMPTZ NULL,
    ADD COLUMN IF NOT EXISTS proposal_id BIGINT NULL REFERENCES route_proposals(id) ON DELETE SET NULL;
