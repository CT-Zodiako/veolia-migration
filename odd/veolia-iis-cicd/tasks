# Feature: IIS deployment automation

## Goal
Automate repeatable production deployment for the Angular frontend and ASP.NET Core API on Windows IIS without rebuilding on the server or overwriting local server configuration.

## Tasks

- [x] Add an idempotent PowerShell deployment script with backup, App Pool coordination, configuration preservation, smoke checks, and rollback guidance.
- [x] Add a GitHub Actions workflow that builds the backend/frontend once and publishes a versioned artifact for the Windows deployment runner.
- [x] Document runner installation, protected production environment, required secrets, first deployment, and rollback.
- [x] Run focused validation for workflow/script syntax and confirm no secrets are committed.

## Constraints

- Keep Oracle connection settings out of Git and preserve the server's appsettings.json.
- Preserve IIS web.config files unless explicitly replaced.
- Frontend output is frontend/dist/veolia-frontend/browser.
- Backend publish target is backend/Veolia.Api/Veolia.Api.csproj.
- The production deployment targets veolia-api and veolia-frontend App Pools and their existing IIS paths.

## Evidence

- Current manual deployment succeeded on Windows Server 2019 with IIS.
- Current server paths: C:\\inetpub\\wwwroot\\veolia-api and C:\\inetpub\\wwwroot\\veolia-frontend.
- Current production configuration is external to the repository.
