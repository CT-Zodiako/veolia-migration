namespace Veolia.Api.Contracts.Requests;

public sealed record FileUploadRequest(int aps, int anno, int mes, string fileBase64, string? fileName = null);
