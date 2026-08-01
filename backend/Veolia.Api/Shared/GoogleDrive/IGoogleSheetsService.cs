namespace Veolia.Api.Infrastructure.GoogleDrive;

/// <summary>
/// Integración genérica y reutilizable con Google Sheets (lectura). Cualquier módulo que
/// necesite traer información desde un Google Sheet compartido con el equipo de negocio
/// (Crecimiento Variables hoy, otros a futuro) pasa por acá en vez de reimplementar el
/// cliente de Google en cada repositorio.
/// </summary>
public interface IGoogleSheetsService
{
    Task<IReadOnlyList<string>> ListTabTitlesAsync(string spreadsheetId, CancellationToken cancellationToken);

    Task<GoogleSheetTabData> ReadTabAsync(string spreadsheetId, string tabTitle, CancellationToken cancellationToken);
}
