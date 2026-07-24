using Veolia.Api.Contracts.Requests;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Infrastructure.GoogleDrive;

namespace Veolia.Api.Services;

public interface ICargueProductividadService
{
    Task<(IReadOnlyList<Dictionary<string, object?>> Propios, IReadOnlyList<Dictionary<string, object?>> Terceros)> ConsultarAsync(
        int anno, int mes, CancellationToken cancellationToken);

    Task GuardarAsync(CargueProductividadGuardarRequest request, CancellationToken cancellationToken);
}

/// <summary>
/// AS-IS: la hoja "PROPIA"/"TERCEROS" del Google Sheet es la fuente de verdad del cargue
/// mensual de productividad (back-tarificador/modules/suministros/controller.js:92-145) --
/// no hay tabla Oracle equivalente para la lectura. "Guardar" sí persiste en Oracle
/// (PORD_PROPIA/PORD_TERCERO), reemplazando el período completo (delete + insert).
/// </summary>
public sealed class CargueProductividadService(
    IGoogleSheetsService sheetsService,
    ISuministrosRepository suministrosRepository) : ICargueProductividadService
{
    private const string SpreadsheetId = "1ECODm4vcJk8q-IdthFNQWI9qrpZRd7kYqPat0bHtoXw";

    public async Task<(IReadOnlyList<Dictionary<string, object?>> Propios, IReadOnlyList<Dictionary<string, object?>> Terceros)> ConsultarAsync(
        int anno, int mes, CancellationToken cancellationToken)
    {
        var propiaTab = await sheetsService.ReadTabAsync(SpreadsheetId, "PROPIA", cancellationToken);
        var tercerosTab = await sheetsService.ReadTabAsync(SpreadsheetId, "TERCEROS", cancellationToken);

        return (FiltrarPorPeriodo(propiaTab, anno, mes), FiltrarPorPeriodo(tercerosTab, anno, mes));
    }

    public async Task GuardarAsync(CargueProductividadGuardarRequest request, CancellationToken cancellationToken)
    {
        var propios = request.dataPropios ?? [];
        var terceros = request.dataTerceros ?? [];

        if (propios.Count == 0 && terceros.Count == 0)
        {
            throw new InvalidOperationException("No hay datos para insertar.");
        }

        var anno = propios.FirstOrDefault()?.ANNO ?? terceros.FirstOrDefault()?.ANNO
            ?? throw new InvalidOperationException("Falta ANNO para eliminar registros existentes.");
        var mes = propios.FirstOrDefault()?.MES ?? terceros.FirstOrDefault()?.MES
            ?? throw new InvalidOperationException("Falta MES para eliminar registros existentes.");

        await suministrosRepository.ReemplazarProductividadAsync(anno, mes, propios, terceros, cancellationToken);
    }

    private static List<Dictionary<string, object?>> FiltrarPorPeriodo(GoogleSheetTabData tab, int anno, int mes) =>
        tab.Rows.Where(row => LeerEntero(row, "ANNO") == anno && LeerEntero(row, "MES") == mes).ToList();

    private static int? LeerEntero(Dictionary<string, object?> row, string columna)
    {
        if (!row.TryGetValue(columna, out var valor) || valor is null) return null;

        return valor switch
        {
            int i => i,
            long l => (int)l,
            double d => (int)d,
            decimal m => (int)m,
            // AS-IS: el legacy leía el sheet con formato regional (p. ej. "2.025") y limpiaba
            // el separador de miles con .replace('.',''); se conserva por si algún valor llega
            // como texto (ReadTabAsync normalmente ya devuelve tipos nativos vía UNFORMATTEDVALUE).
            string s when int.TryParse(s.Replace(".", string.Empty), out var parsed) => parsed,
            _ => null
        };
    }
}
