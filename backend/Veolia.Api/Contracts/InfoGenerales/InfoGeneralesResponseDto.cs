namespace Veolia.Api.Contracts.InfoGenerales;

public sealed class InfoGeneralesResponseDto<T>
{
    public string Status { get; set; } = string.Empty;
    public T? Data { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? TraceId { get; set; }
}
