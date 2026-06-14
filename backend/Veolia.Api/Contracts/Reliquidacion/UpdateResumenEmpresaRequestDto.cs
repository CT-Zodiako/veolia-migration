namespace Veolia.Api.Contracts.Reliquidacion;

public sealed class UpdateResumenEmpresaRequestDto
{
    public long InedId { get; set; }
    public long ReliId { get; set; }
    public decimal Cblj { get; set; }
    public decimal Costo { get; set; }
    public decimal Tarifa { get; set; }
}
