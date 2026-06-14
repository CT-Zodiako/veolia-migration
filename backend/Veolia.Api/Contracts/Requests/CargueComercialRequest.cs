namespace Veolia.Api.Contracts.Requests;

public sealed record CargueComercialRequest(int aps, int anno, int mes, IReadOnlyList<CargueComercialItem>? data);

public sealed record CargueComercialItem(string? concepto, decimal? valor, string? observacion);
