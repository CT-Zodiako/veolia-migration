namespace Veolia.Api.Contracts.Responses;

public sealed record ApiEnvelopeResponse<T>(string Status, T Data, string Message, string? TraceId = null, string? OraCode = null);
