# Feature: Subsidios y Contribuciones decimal editing

## Goal
Allow editing Subsidios y Contribuciones values with negative numbers and decimal fractions, matching the legacy numeric input and Oracle decimal contract.

## Tasks

- [ ] Reproduce and trace frontend input/backend persistence restrictions.
- [x] Fix the edit control and/or API validation without changing unrelated modules.
- [x] Add focused regression coverage and run frontend/backend checks.
- [ ] Review acceptance evidence.

## Constraints

- Preserve percentage semantics and existing edit/create behavior.
- Do not introduce arbitrary precision beyond the supported Oracle column contract.
- Do not log sensitive data or mutate production/legacy databases during tests.

## Evidence

- Legacy uses a native numeric input; Angular now uses `type="number"`, `step="any"`, and finite-number parsing, with no minimum restriction.
- Existing PUT `/api/v1/subcon/editar` sends signed decimal values unchanged to the decimal backend contract.
- Angular `ngc --noEmit` and `git diff --check` passed. Browser behavior and live Oracle persistence remain unverified.
