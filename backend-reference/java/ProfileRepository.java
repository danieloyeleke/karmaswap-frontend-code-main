package com.example.karma.claims;

import com.example.karma.profile.Profile;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;

public interface ProfileRepository extends JpaRepository<Profile, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Profile> findByUserId(Long userId);
}
