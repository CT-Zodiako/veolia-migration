namespace Veolia.Api.Contracts.Reliquidacion;

public sealed class CompararTarifasDto
{
    public long Reli { get; set; }
    public long ApsaId { get; set; }
    public decimal TarifaAps { get; set; }
    public decimal TarifaEmpresa { get; set; }
    public decimal DifTarifa { get; set; }
}
