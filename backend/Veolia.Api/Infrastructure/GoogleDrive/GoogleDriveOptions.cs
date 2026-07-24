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
}
