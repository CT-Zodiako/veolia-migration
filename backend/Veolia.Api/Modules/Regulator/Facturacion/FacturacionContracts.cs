using System.ComponentModel.DataAnnotations;

namespace Veolia.Api.Modules.Regulator.Facturacion;

public sealed class FacturacionRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "El APS es obligatorio.")]
    public int Aps { get; init; }

    [Range(2000, 2999, ErrorMessage = "El año debe estar entre 2000 y 2999.")]
    public int Anno { get; init; }

    [Range(1, 12, ErrorMessage = "El mes debe estar entre 1 y 12.")]
    public int Mes { get; init; }
}

public sealed record FacturacionConsultaMeta(int Aps, int Anno, int Mes, int AnnoConsultado, int MesConsultado);

public sealed record FacturacionResponse(FacturacionConsultaMeta Periodo, IReadOnlyList<IDictionary<string, object?>> Filas);
public sealed record DetaFacturacionResponse(FacturacionConsultaMeta Periodo, IReadOnlyList<IDictionary<string, object?>> Filas);
public sealed record FacturacionClusResponse(FacturacionConsultaMeta Periodo, IReadOnlyList<IDictionary<string, object?>> Filas);
public sealed record FacturacionDincResponse(FacturacionConsultaMeta Periodo, IReadOnlyList<IDictionary<string, object?>> Filas);
public sealed record FacturacionElectronicaResponse(FacturacionConsultaMeta Periodo, IReadOnlyList<IDictionary<string, object?>> Filas);
