namespace Veolia.Api.Contracts.Requests;

public sealed record CargueCompetidorSemRequest(int aps, int anno, int mes, IReadOnlyList<CargueCompetidorSemItem>? data);

public sealed record CargueCompetidorSemItem(string? concepto, decimal? valor, string? observacion);
