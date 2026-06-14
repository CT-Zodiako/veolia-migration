namespace Veolia.Api.Contracts.Reliquidacion;

public sealed class BatchUpdateRequestDto<T>
{
    public List<T> Data { get; set; } = [];
}
