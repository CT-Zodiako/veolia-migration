namespace Veolia.Api.Infrastructure.GoogleDrive;

/// <summary>
/// Config bindable desde la sección "GoogleDrive" de appsettings. La credencial en sí
/// (cuenta de servicio) nunca se commitea: vive en backend/Veolia.Api/Credentials/ (gitignored)
/// y solo el path relativo queda en appsettings.json.
/// </summary>
public sealed class GoogleDriveOptions
{
    public const string SectionName = "GoogleDrive";

    public string CredentialsPath { get; set; } = string.Empty;

    // SUI853 Drive loads (docs/sui853-drive-loads.md). Defaults are the legacy values from
    // back-tarificador/src/modules/sui853/CVA/routes.js (FOLDER_2024_ID, FOLDER_FACTURACION_ID).
    public string ResiduosFolderId { get; set; } = "1X28TgHTNi4DxiA1LYEMnQlo9xqA8KV9s";
    public string ResiduosSheetTitle { get; set; } = "Hoja SUI Recolección";
    public string FacturacionFolderId { get; set; } = "1vZpbi42JtUrRJwMBMN2ujgX2ZS40qbxN";
    public string FacturacionSheetTitle { get; set; } = "sui-facturacion";
}
