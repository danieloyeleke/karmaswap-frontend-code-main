package com.example.karma.claims;

public record ClaimStatusResponse(
    int currentStreak,
    boolean hasClaimedToday,
    boolean hasClaimedSevenDayBonus,
    boolean hasClaimedThirtyDayBonus,
    boolean canClaimDaily,
    boolean canClaimSevenDayBonus,
    boolean canClaimThirtyDayBonus
) {
}
