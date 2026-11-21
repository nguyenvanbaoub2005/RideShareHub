-- SP4-P2-01: Driver trip incident reporting & company/admin operational monitoring

CREATE TABLE trip_incidents (
    id                  BIGSERIAL       PRIMARY KEY,
    trip_id             BIGINT          NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    driver_id           BIGINT          NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    reported_by_user_id BIGINT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    incident_type       VARCHAR(40)     NOT NULL,
    description         VARCHAR(500)    NOT NULL,
    latitude            NUMERIC(10, 7)  NULL,
    longitude           NUMERIC(10, 7)  NULL,
    status              VARCHAR(20)     NOT NULL DEFAULT 'OPEN',
    resolution_note     VARCHAR(500)    NULL,
    resolved_by_user_id BIGINT          NULL REFERENCES users(id) ON DELETE SET NULL,
    resolved_at         TIMESTAMPTZ     NULL,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

CREATE INDEX idx_trip_incidents_trip_status ON trip_incidents(trip_id, status);
CREATE INDEX idx_trip_incidents_status_created ON trip_incidents(status, created_at DESC);
