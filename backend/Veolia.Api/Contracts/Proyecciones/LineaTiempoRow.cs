namespace Veolia.Api.Contracts.Proyecciones;

public sealed class LineaTiempoRow
{
    public long DetlId { get; set; }
    public long ProyId { get; set; }
    public long ApsaId { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public decimal? Deltipc { get; set; }
    public decimal? Deltipcc { get; set; }
    public decimal? Deltsmlv { get; set; }
    public decimal? Deltioexp { get; set; }
    public decimal? Deltfacproduc { get; set; }
    public decimal? Deltindipcc { get; set; }
    public decimal? Deltipccs { get; set; }
}
