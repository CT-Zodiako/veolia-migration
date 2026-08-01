namespace Veolia.Api.Modules.Reliquidaciones.Contracts;

public sealed class ReliInfoEmpresaDto
{
    public long InedId { get; set; }
    public long ReliId { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public string? EmpresaNombre { get; set; }
    public decimal Cblj { get; set; }
    public decimal Lblj { get; set; }
    public decimal N { get; set; }
    public decimal M3agua { get; set; }
    public decimal Cp { get; set; }
    public decimal M2ccj { get; set; }
    public decimal M2lavj { get; set; }
    public decimal Tij { get; set; }
    public decimal Klpj { get; set; }
    public decimal Tmj { get; set; }
    public decimal Clavj { get; set; }
    public decimal Qrtj { get; set; }
    public decimal Qrsj { get; set; }
}
