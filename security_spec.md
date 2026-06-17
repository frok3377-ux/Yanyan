# Security Specification

## 1. Data Invariants
- **TimelineEvent**: Any event must have a valid `id`, `date` (YYYY-MM-DD), `time` (HH:MM), a non-empty `characterId` representing the sender, type (`'chat' | 'narrative' | 'screenshot' | 'marker'`), and text content. Non-admins cannot write any events.
- **Character**: Must have a non-empty name, a theme color, and only admins can create or edit characters.
- **Admin**: An admin record binds a user's authenticated Google email (`frok3377@gmail.com`) to the admin role. Only existing admins can write or modify the admins collection. Regular users cannot access or edit it.

## 2. The "Dirty Dozen" Attack Payloads
Here are 12 specific hostile payloads designed to breach identity, integrity, state, or bounds:

1. **Self-Elevated Admin**: A regular user tries to create an admin document `/admins/malicious_user` with `{ email: "malicious@gmail.com", role: "admin" }` to bypass CMS security. (Denied)
2. **Spoofed Sender ID**: An authenticated user writes a message to `/timeline_events/ev1` setting `characterId: "Ivan"`, but they aren't the admin. (Denied)
3. **Ghost Field Mutation**: Trying to write a timeline event with unapproved keys such as `{ id: "ev2", ..., ghostField: "injected" }`. (Denied)
4. **Invalid Datetime format**: Passing custom string or invalid date YYYY/MM/DD to date parameter. (Denied)
5. **PII Blanket Scrape**: Unauthenticated user trying to read `/admins` list to scrape emails. (Denied)
6. **Denial of Wallet (ID Poisoning)**: Writing a timeline event with a 2MB random binary ID. (Denied)
7. **Negative Timeline Sorting**: Writing an event with `order` set to `-9999999` or very large numbers to mess up the timeline. (Denied)
8. **Invalid Sentiment injection**: Writing an event with sentiment set to `'super_happy'` instead of approved enums. (Denied)
9. **Tampering with static character profile**: A non-admin updating Ivan's `color` to a random hex or breaking CSS. (Denied)
10. **Bypassing Verification**: Writing with a spoofed unverified email pretending to be the admin. (Denied)
11. **Malicious Image payload injection**: Setting script tag in `imageUrl` parameter. (Denied)
12. **Tampering with narrative metadata**: Forging timestamps of messages to rewrite history. (Denied)

## 3. Security Rules
We will implement strict access control in `/firestore.rules` to reject all 12 of these malicious actions.
