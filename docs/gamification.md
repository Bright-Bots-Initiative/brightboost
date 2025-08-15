# Gamification System

The gamification system increases engagement and retention by introducing game-like elements into the learning experience.  
Users earn XP, badges, streaks, and levels through actions that reinforce positive behaviors.

---

## Core Concepts

- **XP (Experience Points):** Tracks progress; unlocks levels; quantifies engagement.
- **Badges:** Achievements for specific milestones or challenges.
- **Streaks:** Consecutive days of engagement in a tracked activity.
- **Level:** Derived from total XP; indicates progression tier.

---

## Reward Rules

### Leveling

- **Level up:** +50 XP
- **Lesson completion:** Add varying amounts of XP based on lesson length or difficulty.

### Streaks

- **Daily module completion:** Increment streak count.
- **Streak record achieved:** +50 XP awarded.
- **5-day streak:** +30 XP and award the "Daily-Challenge" badge.

### In Progress / To Be Defined

- **Quiz ≥ X%:** XP reward TBD based on quiz score thresholds.
- **Milestone:** Award "Module Mastery" badge upon completion of all modules.

---

## API

**Base URL:** `${VITE_AWS_API_URL}`

All endpoints require an `Authorization: Bearer <JWT>` header.

- **GET** `/api/gamification/profile`  
  Retrieves the current user’s gamification status including XP, level, streak, and badges.

  Example response:

  ```json
  {
    "xp": 1250,
    "level": 5,
    "streak": 3,
    "badges": ["Daily-Challenge", "Module Mastery"]
  }
  ```

- **POST** `/api/gamification/add-badge`  
  Adds a badge to the user’s badge array. The badge name is sent as a string in the request body.

  Example request body:

  ```json
  {
    "badgeName": "Daily-Challenge"
  }
  ```

- **POST** `/api/gamification/award-xp`
  Adds XP to the authenticated user.

  Example request body:

  ```json
  {
    "amount": "50",
    "reason": "module_complete"
  }
  ```

- **GET** `/api/gamification/increment-streak`  
  Increments the user's streak count by 1. No request body required.

- **GET** `/api/gamification/break-streak`  
  Resets the user’s streak count to 0. No request body required.

---

## UX Notes

- **Toasts:**
  - Toast shown when users unlock the **"Daily-Challenge"** badge after a 5-day streak (with XP awarded).
  - Reminder toast shown around **12 hours** after the last streak activity to encourage daily engagement ("Keep your streak!").
  - Toast shown when a user manually **breaks their streak** (streak reset notification).

- **Cooldowns:**
  - Toasts trigger only once per relevant event to avoid notification spam.

- **Accessibility (a11y):**
  - Toasts should leverage ARIA live regions or equivalent to be announced by screen readers, ensuring accessibility for all users.

- **Offline and Sync Feedback:**
  - Offline streak events are queued locally and synced automatically when the user is back online, ensuring seamless experience and no data loss.

---

## Edge Cases & Considerations

- **Idempotency:**
  - Streak completion events are deduplicated by date before syncing to prevent double awarding of streak XP or badges.

- **Retries & Offline Handling:**
  - Events stored in IndexedDB queue locally when offline.
  - Automatically retried on reconnect via `window` `online` event listener.

- **Multiple Device Sync:**
  - On syncing, server data overwrites local cache, ensuring streaks, XP, and badges stay consistent across devices.

- **Partial/Missing Data Handling:**
  - Loading streak filters data to recent week (since last Sunday).
  - Falls back gracefully if API calls fail or data is missing locally.

- **Streak Maximum:**
  - Current streak count is capped at **30 days** to limit XP inflation or badge spamming.
