namespace Veolia.Api.Contracts.Requests;

public sealed record TercerosRequest(int aps, int anno, int mes, decimal cdf, decimal ctl, decimal incentivo);
