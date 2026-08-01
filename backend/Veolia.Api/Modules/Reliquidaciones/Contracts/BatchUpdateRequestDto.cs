namespace Veolia.Api.Modules.Reliquidaciones.Contracts;

public sealed class BatchUpdateRequestDto<T>
{
    public List<T> Data { get; set; } = [];
}
