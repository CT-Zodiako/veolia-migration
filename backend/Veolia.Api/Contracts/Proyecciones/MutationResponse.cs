namespace Veolia.Api.Contracts.Proyecciones;

public sealed class MutationResponse
{
    public bool Success { get; set; }
    public string? Message { get; set; }
    public long? Id { get; set; }
}
