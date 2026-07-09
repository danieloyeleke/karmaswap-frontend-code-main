package com.example.karma.claims;

public record ClaimResultResponse(
    String claimType,
    String claimTypeLabel,
    int amountAwarded,
    int currentStreak,
    int updatedKarmaBalance
) {
}
