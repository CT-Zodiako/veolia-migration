using System.Text.Json.Serialization;

namespace Veolia.Api.Contracts.Responses;

public sealed record ApiEnvelopeResponse<T>(
    string Status,
    T Data,
    string Message,
    string? TraceId = null,
    string? OraCode = null,
    [property: JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)] ApiErrorDetail? Detail = null);

// Technical context for developers and support; the toast keeps showing Message only.
public sealed record ApiErrorDetail(string Operacion, string OraCode, string? Constraint, string OracleMessage);
