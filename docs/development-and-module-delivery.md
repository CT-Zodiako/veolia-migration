# Development and Module Delivery Model

This project combines modular migration, continuous integration, and controlled IIS delivery so each migrated capability can progress from legacy parity to production with traceable evidence and a safe rollback path.

## Quick path

1. Develop a bounded module slice across Angular, API, backend repository, and Oracle integration.
2. Validate the slice through the GitHub Actions build and the module acceptance checks.
3. Merge the reviewed change into `main`.
4. Approve the protected `production` environment when the release is ready.
5. Let the Windows IIS runner deploy the exact commit and run smoke checks.

## What the model provides

| Area | Benefit |
|---|---|
| Modular architecture | Auth, regulator, reliquidation, SUI853, and shared capabilities can evolve independently. |
| Legacy parity | Each slice can be compared with the Vue/Express/Oracle behavior before it is accepted. |
| Continuous integration | Every pull request and push builds the .NET API and Angular frontend together. |
| Controlled delivery | A push to `main` creates a versioned artifact and waits for production approval. |
| Traceability | Every deployment is tied to a commit SHA and an Actions run. |
| Configuration safety | Oracle credentials, wallets, and server-only settings remain outside Git artifacts. |
| Recovery | IIS deployments create backups and support explicit rollback. |
| Incremental progress | Modules can be migrated and delivered without waiting for the entire legacy system to be rewritten. |

## Current migration scope

The current `main` line includes the modular foundation and migrated capabilities including:

- Authentication, users, menus, and assignments.
- Regulator capabilities and shared health infrastructure.
- Reliquidaciones.
- SUI853 CFT.
- SUI853 Comercial.
- SUI853 FAC.
- SUI853 Formularios and configuration.

This list describes code present in the branch. It does not, by itself, prove complete functional parity. Each module still needs its own acceptance evidence.

## Module completion matrix

Track every module through the same path:

| Stage | Evidence to collect |
|---|---|
| Frontend | Routes, screens, forms, validation, loading/error states, exports, and permissions. |
| API | Endpoints, request/response contracts, status codes, authentication, and error behavior. |
| Backend | Controllers/modules, repositories, mapping, transactions, and business rules. |
| Oracle | Tables, views, packages, functions, parameters, schemas, and required privileges. |
| Legacy parity | Mapping between the legacy Vue/Express flow and the Angular/.NET flow. |
| Verification | Focused tests, smoke checks, representative data, and negative cases. |
| Delivery | Commit SHA, artifact, deployment result, and rollback point. |

A module should be considered complete only when the relevant rows have evidence, not merely because its files exist.

## Repository boundaries

- Angular source lives under `frontend/`.
- The .NET API lives under `backend/Veolia.Api/`.
- CI/CD is defined in `.github/workflows/deploy.yml`.
- IIS deployment and rollback are implemented in `deploy/deploy.ps1`.
- Production configuration is provisioned on the server and is not replaced by the deployment artifact.
- Oracle connection settings must use the server configuration mechanism, such as `ConnectionStrings__Oracle`, and must never be committed.

## Delivery checklist

Before merging a module slice:

- [ ] The legacy behavior and non-goals are documented.
- [ ] Frontend routes, permissions, validation, and error states are covered.
- [ ] API contracts match the frontend usage.
- [ ] Repository queries and Oracle dependencies are identified.
- [ ] Representative data and failure cases were checked.
- [ ] CI builds the backend and frontend successfully.
- [ ] No credentials, wallets, or production configuration entered the commit.

Before approving production:

- [ ] The Actions artifact belongs to the intended commit.
- [ ] The production environment approval is intentional.
- [ ] The IIS runner is online with the `iis` label.
- [ ] A server backup is available.
- [ ] Post-deploy smoke checks and a functional module check are planned.

## Next step

Maintain one acceptance record per module and link it to the commit or deployment run that delivered it. Use that record to distinguish **implemented**, **integrated**, **verified**, and **accepted in production**; these are different states.
