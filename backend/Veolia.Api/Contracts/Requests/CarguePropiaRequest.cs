namespace Veolia.Api.Contracts.Requests;

public sealed record CarguePropiaRequest(int aps, int anno, int mes, IReadOnlyList<CarguePropiaItem>? data);

public sealed record CarguePropiaItem(string? concepto, decimal? valor, string? observacion);
