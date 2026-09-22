# Feature: SUI853 Residuos Generados

## Goal
Migrate Operaciones → Residuos Generados (`menuId 20001`, `/residuosGenerados`) from legacy Vue/Express to Angular/.NET with detail and summary views.

## Tasks

- [ ] Map legacy component/service/backend contract and define parity acceptance.
- [x] Implement authenticated .NET API and repository contract.
- [x] Implement Angular detail/summary screen, filters, menu, and route parity.
- [x] Add regression tests and run focused checks.
- [ ] Review parity and record runtime/Oracle evidence.

## Constraints

- Preserve legacy filters, detail/summary data, loading/error behavior, and export semantics.
- Do not mutate legacy databases during analysis or tests.
- Keep Oracle values parameterized and protect endpoints with authenticated system context.
- Use existing Angular UI tokens and table patterns.

## Evidence

- Confirmed `menuId 20001` is the Operations detail/summary screen, distinct from Configuración `menuId 30004` Cargue Residuos.
- Added authenticated system-3 detail and summary endpoints with the legacy detail projection and metadata-driven F853GR02 rendering.
- Added APS/year/month selectors, detail filters/pagination/export, and dynamic summary tables; menu mapping now uses 20001.
- Angular `ngc --noEmit` and `git diff --check` passed. Focused backend tests were blocked before execution by unrelated `StubTarifasRepository.ResumenAsync` compilation failure. Live Oracle and F853GR02 metadata remain unverified.
