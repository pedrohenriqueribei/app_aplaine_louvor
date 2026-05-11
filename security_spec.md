# Security Specification - Ministry App

## Data Invariants
1. A **User** profile must always have a `uid` matching its document ID.
2. A **User's** email must match their authentication email.
3. Only the hardcoded administrator (`pedrohenriqueribei@gmail.com`) can bootstrap themselves as a `líder` during creation. Other users must be created as `instrumentista`.
4. Only a `líder` can change the `role` or `status` of any user.
5. Users can update their own profile fields (name, phone, instruments, level, churchId) but cannot change their own `role` or `status` (unless they are already an admin).
6. **Churches**, **Songs**, and **Schedules** can be created/updated/deleted only by a `líder`.
7. All users can read all data (for team collaboration), except PII might need isolation (though for this app, it's a team directory).

## The "Dirty Dozen" Payloads (Wicked Writes)
1. **The Identity Thief**: User A tries to create `users/userB`.
2. **The Role Escalator**: User Lucas tries to create his profile with `role: 'líder'`.
3. **The Self-Promotion**: User Lucas (instrumentista) tries to update his profile with `role: 'líder'`.
4. **The Shadow Field**: Adding `isAdmin: true` to a user document.
5. **The Orphan Maker**: Creating a user with a `churchId` that doesn't exist.
6. **The Email Spoofer**: Creating a user with an email that doesn't match `request.auth.token.email`.
7. **The Status Saboteur**: An instrumentista trying to set their `status` to `inactive` (or back to active).
8. **The Church Hijacker**: An instrumentista trying to create a new `church` document.
9. **The Song Deleter**: An instrumentista trying to delete a song.
10. **The Giant Payload**: Injecting a 1MB string into the `name` field.
11. **The Timestamp Faker**: Sending a future `updatedAt` instead of `serverTimestamp()`.
12. **The PII Scraper**: A non-authenticated user trying to read the user list.

## Test Runner (Logic Outline)
The rules must reject all the above payloads.
Verification:
- `isOwner(userId)` must be the base for user writes.
- `isAdmin()` (check `líder` role) must be the gate for management.
- `isValidUser()` must enforce field types and sizes.
