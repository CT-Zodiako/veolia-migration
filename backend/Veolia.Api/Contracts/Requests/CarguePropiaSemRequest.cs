namespace Veolia.Api.Contracts.Requests;

public sealed record CarguePropiaSemRequest(int aps, int anno, int mes, IReadOnlyList<CarguePropiaSemItem>? data);

public sealed record CarguePropiaSemItem(string? concepto, decimal? valor, string? observacion);
