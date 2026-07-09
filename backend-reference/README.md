# Daily Rewards Backend Reference

These files are starter implementations to copy into your Spring Boot service.

Adjust these pieces to match your backend:

- Package names currently use `com.example.karma`.
- [`ProfileRepository.java`](c:\Users\usr\karma\project\backend-reference\java\ProfileRepository.java) assumes your `Profile` entity lives at `com.example.karma.profile.Profile`.
- [`ClaimController.java`](c:\Users\usr\karma\project\backend-reference\java\ClaimController.java) assumes your authenticated principal exposes an `id` field for `@AuthenticationPrincipal(expression = "id")`.
- The frontend uses separate endpoints for `/daily`, `/7-day`, and `/30-day` so the three reward buttons behave independently.

Expected `Profile` fields:

- `Integer karmaBalance`
- `Integer totalKarmaEarned`
- `LocalDate lastClaimDate`
- `Integer currentStreak`
- `User user`

Recommended endpoints:

- `GET /api/claims/status`
- `POST /api/claims/daily`
- `POST /api/claims/7-day`
- `POST /api/claims/30-day`
