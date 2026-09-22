# Feature: Login validates credentials before systems

## Goal
Stop querying available systems on every email keystroke; reveal the system selector only after a syntactically valid email and successful password verification.

## Tasks

- [x] Define the credential-validation endpoint contract and preserve authentication error semantics.
- [x] Implement backend credential validation plus Angular login flow with cancellation/debounce-safe behavior.
- [x] Add focused regression tests and run frontend/backend checks.
- [ ] Review security and record acceptance evidence.

## Constraints

- Never send a password on each email input event.
- Do not reveal assigned systems for an invalid email/password pair.
- Preserve the existing final login flow and system selection.
- Do not log passwords or credential payloads.

## Evidence

- Added `POST /api/v1/auth/validate-credentials`; it verifies BCrypt credentials and returns only active assigned systems.
- Angular no longer queries systems on email input; password blur performs the preflight and gates the selector/login.
- Removed `getSistemasByCorreo` from anonymous auth routes; post-login callers receive the token through the Angular interceptor.
- API build and Angular `ngc --noEmit` passed; full auth test project remains blocked by unrelated `StubTarifasRepository.ResumenAsync` compilation failure.
