1. Data Invariants:
- A department must belong to a valid church.
- A member inside a department must reference a valid user UID.
- The roles array must only contain valid string roles.

2. The "Dirty Dozen" Payloads:
- Missing userId
- Invalid roles type
- Empty roles array
...

3. The Test Runner:
...
