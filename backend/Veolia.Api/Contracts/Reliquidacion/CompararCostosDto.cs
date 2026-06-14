namespace Veolia.Api.Contracts.Reliquidacion;

public sealed class CompararCostosDto
{
    public long CodReliq { get; set; }
    public long ApsaId { get; set; }
    public string RelqDesde { get; set; } = string.Empty;
    public string RelqHasta { get; set; } = string.Empty;
    public decimal CostoAps { get; set; }
    public decimal CostoEmpresa { get; set; }
    public decimal DifCosto { get; set; }
}
