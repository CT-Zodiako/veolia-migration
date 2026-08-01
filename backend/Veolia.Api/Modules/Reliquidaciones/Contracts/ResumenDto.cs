namespace Veolia.Api.Modules.Reliquidaciones.Contracts;

public sealed class ResumenDto
{
    public long RelqId { get; set; }
    public long ApsaId { get; set; }
    public string Bloque { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public string? JsonDetalle { get; set; }
}
