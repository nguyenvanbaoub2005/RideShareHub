CREATE TABLE invalidated_tokens (
    id UUID PRIMARY KEY,
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_invalidated_tokens_expires_at ON invalidated_tokens(expires_at);
