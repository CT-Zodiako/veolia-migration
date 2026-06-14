namespace Veolia.Api.Contracts.Requests;

public sealed record CargueComercialSemRequest(int aps, int anno, int mes, IReadOnlyList<CargueComercialSemItem>? data);

public sealed record CargueComercialSemItem(string? concepto, decimal? valor, string? observacion);
