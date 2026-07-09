package com.example.karma.claims;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/claims")
public class ClaimController {

    private final ClaimService claimService;

    public ClaimController(ClaimService claimService) {
        this.claimService = claimService;
    }

    @GetMapping("/status")
    public ClaimStatusResponse getStatus(@AuthenticationPrincipal(expression = "id") Long userId) {
        return claimService.getStatus(userId);
    }

    @PostMapping("/daily")
    public ClaimResultResponse claimDaily(@AuthenticationPrincipal(expression = "id") Long userId) {
        return claimService.claimDaily(userId);
    }

    @PostMapping("/7-day")
    public ClaimResultResponse claimSevenDayBonus(@AuthenticationPrincipal(expression = "id") Long userId) {
        return claimService.claimSevenDayBonus(userId);
    }

    @PostMapping("/30-day")
    public ClaimResultResponse claimThirtyDayBonus(@AuthenticationPrincipal(expression = "id") Long userId) {
        return claimService.claimThirtyDayBonus(userId);
    }
}
