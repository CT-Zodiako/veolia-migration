namespace Veolia.Api.Contracts.Reliquidacion;

public sealed class UpdateResumenRellenoRequestDto
{
    public long IareId { get; set; }
    public long ReliId { get; set; }
    public decimal Qrs { get; set; }
    public decimal Costo { get; set; }
    public decimal Tarifa { get; set; }
}
