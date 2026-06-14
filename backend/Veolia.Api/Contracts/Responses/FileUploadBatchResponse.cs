namespace Veolia.Api.Contracts.Responses;

public sealed record FileUploadBatchResponse(
    int filasLeidas,
    int filasValidas,
    int filasInvalidas,
    int filasInsertadas,
    IReadOnlyList<string> errores);
