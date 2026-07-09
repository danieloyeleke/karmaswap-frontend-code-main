ALTER TABLE profiles
  ADD COLUMN last_claim_date DATE NULL,
  ADD COLUMN current_streak INT NOT NULL DEFAULT 0;

CREATE TABLE claims_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  amount INT NOT NULL,
  claim_type VARCHAR(50) NOT NULL,
  claimed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_claims_log_user
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_claims_log_user_type_time
  ON claims_log (user_id, claim_type, claimed_at DESC);
