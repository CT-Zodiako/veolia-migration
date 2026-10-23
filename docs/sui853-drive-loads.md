# SUI853 Drive loads (30004, 30005, 30007)

Three SUI853 Configuración screens read Google Sheets from a shared Google Drive folder and load the rows into Oracle.

| Menu | Screen (route) | Endpoint | Drive folder / tab | Oracle table |
|---|---|---|---|---|
| 30004 Cargue Residuos | `/cargueResiduos` | `POST /api/v1/sui853Configuracion/cargueResiduos` `{ apsId, anno }` | `ResiduosFolderId` / `ResiduosSheetTitle` | `SUI.TGEN_RESGENERADOS` |
| 30005 Cargue Facturación | `/informesGenerados` | `POST /api/v1/sui853Configuracion/cargueFacturacion` `{ apsId, anno }` | `FacturacionFolderId` / `FacturacionSheetTitle` | `SUI.TGEN_COMERCIAL` |
| 30007 Cargue Facturación Mes | `/informesGeneradosMes` | same endpoint, `{ apsId, anno, mes }` (`mes` = `Enero` … `Diciembre`) | same as 30005 | `SUI.TGEN_COMERCIAL` |

Only authenticated users of the SUI853 system can call these endpoints (`idSistema = 3`). A request with no token gets 403, a bad token gets 401, and a valid token for another system gets 403.

## Configuration

These keys go in the `GoogleDrive` section of the server configuration (`appsettings.{Environment}.json` or environment variables such as `GoogleDrive__ResiduosFolderId`). If a key is missing, the server uses the legacy value from `back-tarificador/src/modules/sui853/CVA/routes.js`.

| Key | Default (legacy) | Purpose |
|---|---|---|
| `CredentialsPath` | — (required) | Service-account JSON file. Never commit it; keep it outside Git (for example `backend/Veolia.Api/Credentials/`, which is gitignored). |
| `ResiduosFolderId` | `1X28TgHTNi4DxiA1LYEMnQlo9xqA8KV9s` | Root folder for 30004 |
| `ResiduosSheetTitle` | `Hoja SUI Recolección` | Tab read from each residuos file |
| `FacturacionFolderId` | `1vZpbi42JtUrRJwMBMN2ujgX2ZS40qbxN` | Root folder for 30005/30007 |
| `FacturacionSheetTitle` | `sui-facturacion` | Tab read from each facturación file |

**Scopes:** the service account only asks for read access: `https://www.googleapis.com/auth/drive.readonly` and `https://www.googleapis.com/auth/spreadsheets.readonly`. Share both folders with the service-account e-mail as a Viewer. Drive v3 is called over REST with the service-account token, so no new NuGet package is needed.

## How files are selected

This is a port of `back-tarificador/src/helpers/readFolder.js`:

1. The server lists the root folder's subfolders and sorts them like `localeCompare("es", { numeric: true })`, so `2 Febrero` comes before `10 Octubre`. If the root has no subfolders, it reads the spreadsheets in the root instead.
2. It keeps spreadsheets whose name contains the APS name (`SUI.TCFG_APS.NOMBRE_APS`) and the year. For 30007 the name must also contain the month. Matching ignores case.
3. The month filter (30007) applies to file names only. Legacy also skipped subfolders without the month in their name; that is not done, because facturación folders are not necessarily named by month.
4. For 30007, only files whose name parses to the requested month (for example `Salamina-SUI Mayo 2024`) are loaded, so a month load can only replace that month.
5. If no file matches, the load is rejected with `INVALID_PARAMS` ("No se encontraron archivos…") and nothing is deleted. Legacy reported success with zero files.
6. From each file it reads the first tab whose title matches the configured title, ignoring case. A file without that tab is reported as a warning and loads no rows.
7. Values are read as `UNFORMATTED_VALUE` and dates as `FORMATTED_STRING`.

## How rows are loaded

- **One transaction per load.** The server first deletes exactly the `(APS, ANNO, MES)` combinations present in the harvested rows, then inserts the rows. If anything fails, everything rolls back and nothing is written. Legacy had no delete, so a re-run duplicated data, and failures left partial loads.
- **Where ANNO/MES come from (legacy rules).**
  - Residuos: ANNO is the selected year. MES is the month of `FECHA ENTRADA`, or 0 when the row has no date.
  - Facturación: ANNO and MES come from the file name (`Salamina-SUI Diciembre 2024` → 2024/12; `Setiembre` and accented names are accepted). If the name has no year, the selected year is used; if it has no month, MES is 0.
- **EMPRESA** (facturación) is the APS's company from `SUI.VCFGAPSEMPRESA.EMPRESA`, looked up by `TCFG_APS_ID`. If the APS has no company, or more than one, the load is rejected before reading Drive. Legacy always wrote `"Test"`.
- **All values are bind parameters.** Dates are parsed in C# as `DD-MM-YYYY` (also `D-M-YYYY`, `DD/MM/YYYY` and Sheets serial numbers) and bound as `DateTime`. Legacy built `TO_DATE('…')` strings, which allowed SQL injection.
- **Numbers follow legacy `safeNumber`.** A blank cell becomes 0. A non-numeric value (for example `12,5`) is a validation error that names the sheet header, the Oracle column, the file, the tab and the row. Nothing is written.
- **Unreadable files.** If any matching file cannot be read, the load returns 502 `HARVEST_ERROR` and nothing is written. Legacy silently skipped the file.
- **Audit columns:** residuos rows get `VLR_PEAJES = 0`, `FEC_REGIST = SYSDATE` and `USU_REG = SESSION_USER`, as in legacy.

The column maps are in `backend/Veolia.Api/Modules/Sui853/Configuracion/Sui853DriveLoadsContracts.cs` (`DriveLoadTarget.Residuos`, `DriveLoadTarget.Comercial`, 59 columns).

**Legacy quirk kept on purpose:** in `TGEN_COMERCIAL`, both `DTOXCOMP` and `DEVFEXCOE` read the sheet column `D_CSDF`. This still needs business confirmation.

## Error responses

Errors come back as `{ status, data }`, where `data.type` is one of:

| `type` | HTTP | Meaning |
|---|---|---|
| `INVALID_PARAMS` | 400 | Bad year or month, unknown APS, an APS without a single company, or no matching file in Google Drive |
| `VALIDATION_ERROR` | 400 | A value in a row is invalid. Includes `fileName`, `sheetTitle`, `rowNumber` (sheet row, header = 1), `row`, and `validation { campo, columna, valor }` |
| `HARVEST_ERROR` | 502 | Drive or Sheets could not be read (`fileName` when known) |
| `DB_ERROR` | 500 | The insert failed. Includes the failing row's location, and `oracle.message` for database errors. Everything was rolled back |
