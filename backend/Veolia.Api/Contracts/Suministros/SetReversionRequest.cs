namespace Veolia.Api.Contracts.Suministros;

public sealed record SetReversionRequest(int aps, int anno, int mes, string motivo);
