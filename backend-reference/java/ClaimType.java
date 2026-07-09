package com.example.karma.claims;

public enum ClaimType {
    DAILY_LOGIN("Daily Claim"),
    SEVEN_DAY_STREAK("7-Day Bonus"),
    THIRTY_DAY_STREAK("30-Day Bonus");

    private final String label;

    ClaimType(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}
