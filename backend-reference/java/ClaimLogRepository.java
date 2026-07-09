package com.example.karma.claims;

import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;

public interface ClaimLogRepository extends JpaRepository<ClaimLog, Long> {

    boolean existsByUserIdAndClaimTypeAndClaimedAtGreaterThanEqual(
        Long userId,
        ClaimType claimType,
        LocalDateTime claimedAt
    );
}
