namespace Veolia.Api.Contracts.Reliquidacion;

public sealed class ReliInfoApsDto
{
    public long IaedId { get; set; }
    public long ReliId { get; set; }
    public decimal Qrtz { get; set; }
    public decimal Costo { get; set; }
    public decimal Tarifa { get; set; }
}
