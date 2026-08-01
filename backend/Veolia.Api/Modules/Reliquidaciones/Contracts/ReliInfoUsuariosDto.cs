namespace Veolia.Api.Modules.Reliquidaciones.Contracts;

public sealed class ReliInfoUsuariosDto
{
    public long IuaeId { get; set; }
    public long ReliId { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public long? DiviDivi { get; set; }
    public long? ClasClaseUso { get; set; }
    public string? ClasNombre { get; set; }
    public long? ParaTipTar20012 { get; set; }
    public string? TipoTarifaNombre { get; set; }
    public long? ParaUbicacion20016 { get; set; }
    public long? ParaTipFac20014 { get; set; }
    public long? FaprCodigo { get; set; }
    public string? FactorProduccionNombre { get; set; }
    public decimal Cantidad { get; set; }
    public decimal Toneladas { get; set; }
}
