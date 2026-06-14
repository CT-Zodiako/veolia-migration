namespace Veolia.Api.Contracts.Responses;

public sealed record FacturacionConsultaMeta(int Aps, int Anno, int Mes, int AnnoConsultado, int MesConsultado);

public sealed record FacturacionResponse(FacturacionConsultaMeta Periodo, IReadOnlyList<IDictionary<string, object?>> Filas);
public sealed record DetaFacturacionResponse(FacturacionConsultaMeta Periodo, IReadOnlyList<IDictionary<string, object?>> Filas);
public sealed record FacturacionClusResponse(FacturacionConsultaMeta Periodo, IReadOnlyList<IDictionary<string, object?>> Filas);
public sealed record FacturacionDincResponse(FacturacionConsultaMeta Periodo, IReadOnlyList<IDictionary<string, object?>> Filas);
public sealed record FacturacionElectronicaResponse(FacturacionConsultaMeta Periodo, IReadOnlyList<IDictionary<string, object?>> Filas);
