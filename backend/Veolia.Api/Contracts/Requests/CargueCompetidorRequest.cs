namespace Veolia.Api.Contracts.Requests;

public sealed record CargueCompetidorRequest(int aps, int anno, int mes, IReadOnlyList<CargueCompetidorItem>? data);

public sealed record CargueCompetidorItem(string? concepto, decimal? valor, string? observacion);
