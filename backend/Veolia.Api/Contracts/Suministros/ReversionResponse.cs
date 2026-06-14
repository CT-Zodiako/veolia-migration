namespace Veolia.Api.Contracts.Suministros;

public sealed record ReversionResponse(bool ok, string? message, int? reversionId);
