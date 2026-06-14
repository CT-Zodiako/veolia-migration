namespace Veolia.Api.Contracts.Requests;

public sealed record QRTRuralRequest(int aps, int anno, int mes, decimal? qrtRural, string? observacion = null);
