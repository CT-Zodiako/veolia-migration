# Deploy to IIS with GitHub Actions

## Deployment model

`.github/workflows/deploy.yml` builds on every push and pull request using an Ubuntu-hosted runner. It publishes `backend/Veolia.Api/Veolia.Api.csproj` for .NET 10 / Windows x64 (framework-dependent), runs the Angular production build, and packages `frontend/dist/veolia-frontend/browser`.

The artifact `veolia-iis-<commit SHA>` contains `api/`, `frontend/`, `deploy/deploy.ps1`, and `commit-sha.txt`. GitHub retains it for 14 days. Each run downloads its own artifact; production does not rebuild or check out source. The API also receives the source revision at publish time.

Only a **push to `main`** can enter the protected `production` environment and execute the package on the IIS server. PR code runs on Ubuntu, never on the production runner. CI currently validates compilation and packaging, not automated application tests. Docker Compose is not part of this deployment path.

## One-time server prerequisites

1. Use a dedicated Windows x64 IIS server. Install IIS, its management scripting tools (including the `WebAdministration` Windows PowerShell module), Static Content, and the IIS URL Rewrite module if used by the SPA configuration.
2. Install the **.NET 10 ASP.NET Core Hosting Bundle** after IIS; repair it if IIS was installed later. Restart IIS as directed by the installer. Node and the .NET SDK are not needed on this server.
3. Create these sites and pools (the script does not provision IIS):

   | Site physical path | App Pool | Local binding |
   | --- | --- | --- |
   | `C:\inetpub\wwwroot\veolia-api` | `veolia-api` | `http://localhost:5000/` |
   | `C:\inetpub\wwwroot\veolia-frontend` | `veolia-frontend` | `http://localhost/` |

   Use distinct dedicated pools, Integrated mode, No Managed Code, and 64-bit workers. Ensure the bindings reach these sites rather than the default IIS site. Grant the pool identities read/execute access to their site files; grant write access only to application directories that actually require it.
4. Provision the frontend `web.config` on the server **before deployment**: configure SPA fallback to `index.html` for non-file/non-directory routes. Configure an `/api` reverse proxy before that fallback if the frontend uses a same-origin API. IIS ARR and proxy enablement are required for that option. Alternatively configure the production frontend API URL and backend CORS before building. Validate the browser-facing URL: browser `localhost` refers to the user's machine, not the IIS server.
5. Provision any required backend `appsettings*.json` on the server. Published copies are deliberately excluded, including on the first deployment. The API `web.config` comes from `dotnet publish` and is replaced on deployment; do not store server-only settings there.
6. Configure `ConnectionStrings__Oracle` securely **on the server**, outside deployed files (for example in the machine environment). Restart the relevant services/workers after changing environment variables. Provision Oracle wallet/client prerequisites if applicable, and grant the API identity access to them. Never put Oracle credentials or wallets in repository artifacts, workflow YAML, runner labels, or script arguments.
7. Allow outbound HTTPS from the runner to the GitHub Actions service and artifact storage endpoints, according to GitHub's current runner networking requirements. No inbound GitHub connection to IIS is needed. Allow the API server to reach the Oracle listener and any other required application services. Configure client-facing DNS, TLS certificates, firewall rules and IIS bindings independently.

Smoke tests use local HTTP, not the public load balancer or Oracle database. Production TLS, authentication, proxy behavior and database connectivity require separate acceptance checks. The default API check is `/api/health`, not `/api/health/db`.

## Runner, permissions and approval

- In repository **Settings → Actions → Runners**, add a Windows x64 self-hosted runner on the IIS server using GitHub's generated setup instructions and short-lived registration token. Install it as a service under a dedicated deployment account. Add the custom `iis` label; the job requires `[self-hosted, windows, iis]`.
- The account must run elevated for `WebAdministration` and the script's administrator requirement, control the two App Pools, and read/write the site directories and `C:\inetpub\veolia-backups`. Protect the runner installation, work directory, temporary packages and backups with restrictive ACLs. Backups may contain server-side credentials even though CI must not.
- An administrative runner is privileged code execution. Restrict runner groups/repository access where available, protect `main`, require review for workflow/script changes, and never reuse this runner for untrusted PR jobs or unrelated repositories.
- Create the **`production` environment** in Settings → Environments **before enabling production deployment**. Configure required reviewers, prevent self-review where available, and restrict deployment branches to `main`. The YAML environment name alone does not enable approval. Required-reviewer availability depends on the GitHub plan/repository visibility; verify it before using this pipeline.
- No custom GitHub secrets are required. GitHub supplies its scoped Actions token for artifact access; repository permission is `contents: read`. **No Oracle secret belongs in GitHub Actions.** Runner registration credentials are used only during setup.

## First deployment

1. Complete the prerequisites, create both site directories, and provision the frontend `web.config` and required server configuration. Verify the runner can control the pools and that its PowerShell execution policy permits the reviewed deployment script.
2. Merge the reviewed workflow/script changes into protected `main`. Inspect the Ubuntu build and the artifact SHA, then approve the production environment job.
3. The script validates the package and directory separation, obtains a server-wide deployment lock, stops both pools with bounded retries, and snapshots both sites under `C:\inetpub\veolia-backups\<UTC timestamp>`. A `complete.json` marker is written only after both backups succeed.
4. Robocopy mirrors application files, removing stale application files. Backend `appsettings*.json` and frontend `web.config`/`web.config.bak` are neither overwritten nor deleted. It then starts the pools with bounded retries and checks the frontend root and API `/api/health`, retrying while workers warm up.
5. Validate the public UI, a deep SPA route, browser API calls and Oracle connectivity separately. Inspect IIS/application logs if anything fails.

Repeated deployments converge to the package contents, preserving the specified configuration and creating a fresh backup each time. Paths must be local, separate, non-overlapping directories without reparse points. Deployments to the same server are serialized; workflow deployment concurrency does not cancel an in-progress deployment. Monitor disk space: server backups and runner packages are not automatically pruned, and GitHub's artifact retention does not remove them. Schedule retention maintenance outside deployment, preserving known-good recovery points.

## Manual deployment and overrides

Extract the artifact to a dedicated directory outside both sites and the backup tree. In **elevated Windows PowerShell 5.1**, run the reviewed script:

```powershell
.\deploy\deploy.ps1 -ArtifactPath 'C:\releases\veolia-<sha>'
```

Optional parameters: `-ApiPath`, `-FrontendPath`, `-ApiPool`, `-FrontendPool`, `-BackupRoot`, `-FrontendUrl`, and `-ApiUrl`. URL values must resolve syntactically to loopback HTTP(S) URLs; `-ApiUrl` is the API base URL with a trailing slash, and the script appends `api/health`. For example:

```powershell
.\deploy\deploy.ps1 -ArtifactPath 'C:\releases\veolia-<sha>' `
  -FrontendUrl 'http://localhost:8080/' -ApiUrl 'http://localhost:5000/'
```

Defaults are the paths, pools and bindings in the prerequisites table. The workflow uses these defaults; review and update its invocation if production bindings or paths differ. Custom host-only IIS bindings require a loopback-accessible binding for these checks.

## Failure and rollback

The job fails on invalid input, incomplete artifacts, backup/copy errors, pool timeouts or smoke-test failures. Robocopy exit codes below 8 are successful. If copying fails, the script attempts to restart both pools and reports restart errors without concealing the original failure. A partially copied or unhealthy release is **not automatically rolled back**; inspect the logs and perform explicit recovery promptly. Deployment involves downtime and is not an atomic or blue/green switch.

To restore the latest complete snapshot for the configured paths:

```powershell
.\deploy\deploy.ps1 -Rollback
```

Supply the same path/pool/backup/URL overrides used for deployment, if any. Rollback needs no artifact, stops the pools, mirrors the complete saved trees (including configuration), restarts the pools and repeats smoke checks. It ignores incomplete backups and rejects the latest backup if its target paths differ. Rollback does not create another backup, so repeating it restores the same snapshot. It does not roll back Oracle data, machine environment settings, IIS configuration, certificates or external services.

The latest backup is the state **before the latest deployment attempt**, not necessarily the last healthy release. Do not retry a failed deployment before recovering, because a retry can back up an already broken state. Before rolling back, inspect the latest snapshot and preserve any post-backup configuration changes through your approved operational process. For an older known-good release, download its retained artifact and explicitly deploy it after assessing server configuration compatibility. An initial empty-site backup restores empty sites and will fail smoke checks; complete first-deployment prerequisites and redeploy instead.
