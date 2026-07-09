package com.example.karma.claims;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "claims_log")
public class ClaimLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private Integer amount;

    @Enumerated(EnumType.STRING)
    @Column(name = "claim_type", nullable = false, length = 50)
    private ClaimType claimType;

    @Column(name = "claimed_at", nullable = false)
    private LocalDateTime claimedAt;

    public ClaimLog() {
    }

    public ClaimLog(Long userId, Integer amount, ClaimType claimType, LocalDateTime claimedAt) {
        this.userId = userId;
        this.amount = amount;
        this.claimType = claimType;
        this.claimedAt = claimedAt;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public Integer getAmount() {
        return amount;
    }

    public ClaimType getClaimType() {
        return claimType;
    }

    public LocalDateTime getClaimedAt() {
        return claimedAt;
    }
}
