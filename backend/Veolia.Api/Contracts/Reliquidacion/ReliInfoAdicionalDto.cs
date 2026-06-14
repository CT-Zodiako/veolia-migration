namespace Veolia.Api.Contracts.Reliquidacion;

public sealed class ReliInfoAdicionalDto
{
    public long CeadId { get; set; }
    public long ReliId { get; set; }
    public decimal Cdf { get; set; }
    public decimal Ctl { get; set; }
}
