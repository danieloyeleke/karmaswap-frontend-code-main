package com.example.karma.claims;

import com.example.karma.profile.Profile;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.springframework.http.HttpStatus.BAD_REQUEST;

@Service
public class ClaimService {

    private static final int DAILY_KARMA = 1;
    private static final int SEVEN_DAY_BONUS = 25;
    private static final int THIRTY_DAY_BONUS = 100;

    private final ProfileRepository profileRepository;
    private final ClaimLogRepository claimLogRepository;
    private final ZoneId appZoneId;

    public ClaimService(ProfileRepository profileRepository, ClaimLogRepository claimLogRepository) {
        this.profileRepository = profileRepository;
        this.claimLogRepository = claimLogRepository;
        this.appZoneId = ZoneId.systemDefault();
    }

    @Transactional(readOnly = true)
    public ClaimStatusResponse getStatus(Long userId) {
        Profile profile = getProfile(userId);
        LocalDate today = LocalDate.now(appZoneId);

        boolean hasClaimedToday = today.equals(profile.getLastClaimDate());
        boolean hasClaimedSevenDayBonus = hasClaimedBonusThisRun(userId, profile, ClaimType.SEVEN_DAY_STREAK);
        boolean hasClaimedThirtyDayBonus = hasClaimedBonusThisRun(userId, profile, ClaimType.THIRTY_DAY_STREAK);

        return new ClaimStatusResponse(
            profile.getCurrentStreak(),
            hasClaimedToday,
            hasClaimedSevenDayBonus,
            hasClaimedThirtyDayBonus,
            !hasClaimedToday,
            profile.getCurrentStreak() >= 7 && !hasClaimedSevenDayBonus,
            profile.getCurrentStreak() >= 30 && !hasClaimedThirtyDayBonus
        );
    }

    @Transactional
    public ClaimResultResponse claimDaily(Long userId) {
        Profile profile = getProfile(userId);
        LocalDate today = LocalDate.now(appZoneId);
        LocalDate yesterday = today.minusDays(1);

        if (today.equals(profile.getLastClaimDate())) {
            throw new ResponseStatusException(BAD_REQUEST, "Daily reward already claimed today.");
        }

        int nextStreak = calculateNextStreak(
            profile.getLastClaimDate(),
            profile.getCurrentStreak(),
            today,
            yesterday
        );

        profile.setCurrentStreak(nextStreak);
        profile.setLastClaimDate(today);
        profile.setKarmaBalance(profile.getKarmaBalance() + DAILY_KARMA);
        profile.setTotalKarmaEarned(profile.getTotalKarmaEarned() + DAILY_KARMA);

        profileRepository.save(profile);
        claimLogRepository.save(new ClaimLog(userId, DAILY_KARMA, ClaimType.DAILY_LOGIN, LocalDateTime.now(appZoneId)));

        return new ClaimResultResponse(
            ClaimType.DAILY_LOGIN.name(),
            ClaimType.DAILY_LOGIN.getLabel(),
            DAILY_KARMA,
            nextStreak,
            profile.getKarmaBalance()
        );
    }

    @Transactional
    public ClaimResultResponse claimSevenDayBonus(Long userId) {
        Profile profile = getProfile(userId);
        validateBonusEligibility(userId, profile, 7, ClaimType.SEVEN_DAY_STREAK);

        profile.setKarmaBalance(profile.getKarmaBalance() + SEVEN_DAY_BONUS);
        profile.setTotalKarmaEarned(profile.getTotalKarmaEarned() + SEVEN_DAY_BONUS);

        profileRepository.save(profile);
        claimLogRepository.save(new ClaimLog(userId, SEVEN_DAY_BONUS, ClaimType.SEVEN_DAY_STREAK, LocalDateTime.now(appZoneId)));

        return new ClaimResultResponse(
            ClaimType.SEVEN_DAY_STREAK.name(),
            ClaimType.SEVEN_DAY_STREAK.getLabel(),
            SEVEN_DAY_BONUS,
            profile.getCurrentStreak(),
            profile.getKarmaBalance()
        );
    }

    @Transactional
    public ClaimResultResponse claimThirtyDayBonus(Long userId) {
        Profile profile = getProfile(userId);
        validateBonusEligibility(userId, profile, 30, ClaimType.THIRTY_DAY_STREAK);

        profile.setKarmaBalance(profile.getKarmaBalance() + THIRTY_DAY_BONUS);
        profile.setTotalKarmaEarned(profile.getTotalKarmaEarned() + THIRTY_DAY_BONUS);

        profileRepository.save(profile);
        claimLogRepository.save(new ClaimLog(userId, THIRTY_DAY_BONUS, ClaimType.THIRTY_DAY_STREAK, LocalDateTime.now(appZoneId)));

        return new ClaimResultResponse(
            ClaimType.THIRTY_DAY_STREAK.name(),
            ClaimType.THIRTY_DAY_STREAK.getLabel(),
            THIRTY_DAY_BONUS,
            profile.getCurrentStreak(),
            profile.getKarmaBalance()
        );
    }

    private Profile getProfile(Long userId) {
        return profileRepository.findByUserId(userId)
            .orElseThrow(() -> new EntityNotFoundException("Profile not found for user " + userId));
    }

    private int calculateNextStreak(LocalDate lastClaimDate, Integer currentStreak, LocalDate today, LocalDate yesterday) {
        if (lastClaimDate == null) {
            return 1;
        }

        if (lastClaimDate.equals(yesterday)) {
            return Math.max(1, (currentStreak == null ? 0 : currentStreak) + 1);
        }

        if (lastClaimDate.isBefore(yesterday)) {
            return 1;
        }

        return 1;
    }

    private void validateBonusEligibility(Long userId, Profile profile, int requiredStreak, ClaimType claimType) {
        if (profile.getCurrentStreak() < requiredStreak) {
            throw new ResponseStatusException(
                BAD_REQUEST,
                "You need a " + requiredStreak + "-day streak before claiming this bonus."
            );
        }

        if (hasClaimedBonusThisRun(userId, profile, claimType)) {
            throw new ResponseStatusException(BAD_REQUEST, "This streak bonus has already been claimed.");
        }
    }

    private boolean hasClaimedBonusThisRun(Long userId, Profile profile, ClaimType claimType) {
        if (profile.getCurrentStreak() <= 0 || profile.getLastClaimDate() == null) {
            return false;
        }

        LocalDate streakStart = profile.getLastClaimDate().minusDays(profile.getCurrentStreak() - 1L);
        return claimLogRepository.existsByUserIdAndClaimTypeAndClaimedAtGreaterThanEqual(
            userId,
            claimType,
            streakStart.atStartOfDay()
        );
    }
}
