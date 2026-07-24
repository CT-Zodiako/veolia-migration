using Veolia.Api.Contracts.Proyecciones;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Infrastructure.GoogleDrive;

namespace Veolia.Api.Services;

public interface ICrecimientoDriveService
{
    Task<IReadOnlyList<CrecimientoDriveTabResponse>> CargarDesdeDriveAsync(long apsaId, CancellationToken cancellationToken);
}

/// <summary>
/// Orquesta la carga "Crecimiento Variables Programadas" desde Drive: busca en Oracle qué
/// spreadsheet/pestañas le corresponden al APS (PROY_CRECIMIENTO_VBLES) y las lee vía
/// IGoogleSheetsService. Vive en Services (no en Infrastructure/Data) porque combina Oracle
/// + una API externa, no es un repositorio de una sola tabla.
/// </summary>
public sealed class CrecimientoDriveService(
    ICrecimientoRepository crecimientoRepository,
    IGoogleSheetsService sheetsService) : ICrecimientoDriveService
{
    public async Task<IReadOnlyList<CrecimientoDriveTabResponse>> CargarDesdeDriveAsync(long apsaId, CancellationToken cancellationToken)
    {
        var config = await crecimientoRepository.GetDriveConfigAsync(apsaId, cancellationToken);
        if (config is null || string.IsNullOrWhiteSpace(config.IdArchivo))
        {
            throw new InvalidOperationException("No hay un Google Sheet configurado para este APS en PROY_CRECIMIENTO_VBLES.");
        }

        var hojas = config.ListaHojas
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        var resultados = new List<CrecimientoDriveTabResponse>();
        foreach (var hoja in hojas)
        {
            try
            {
                var tab = await sheetsService.ReadTabAsync(config.IdArchivo, hoja, cancellationToken);
                resultados.Add(new CrecimientoDriveTabResponse
                {
                    SheetTitle = tab.SheetTitle,
                    Columns = tab.Columns,
                    Rows = tab.Rows,
                    Error = tab.Error
                });
            }
            catch (Exception ex)
            {
                resultados.Add(new CrecimientoDriveTabResponse { SheetTitle = hoja, Error = ex.Message });
            }
        }

        return resultados;
    }
}
