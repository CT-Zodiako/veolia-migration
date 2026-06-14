namespace Veolia.Api.Contracts.Proyecciones;

public sealed class CrecimientoConsultaRequest
{
    public long ProyId { get; set; }
}

public sealed class CrecimientoUsuariosRequest
{
    public long ProyId { get; set; }
    public long ApsaId { get; set; }
    public List<CrecimientoUsuariosItem> Items { get; set; } = new();
}

public sealed class CrecimientoUsuariosItem
{
    public long? PrusId { get; set; }
    public int Anno { get; set; }
    public int Semestre { get; set; }
    public decimal? Coduso { get; set; }
    public decimal? Codtipopred { get; set; }
    public decimal? Cantidad { get; set; }
    public decimal? Toneladas { get; set; }
}

public sealed class CrecimientoPropiaRequest
{
    public long ProyId { get; set; }
    public long ApsaId { get; set; }
    public List<CrecimientoPropiaItem> Items { get; set; } = new();
}

public sealed class CrecimientoPropiaItem
{
    public long? PrprId { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public decimal? VUsuarios { get; set; }
    public decimal? VToneladas { get; set; }
    public decimal? VIngresos { get; set; }
    public decimal? VCostos { get; set; }
}

public sealed class CrecimientoTercerosRequest
{
    public long ProyId { get; set; }
    public long ApsaId { get; set; }
    public List<CrecimientoTercerosItem> Items { get; set; } = new();
}

public sealed class CrecimientoTercerosItem
{
    public long? PrcoId { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public decimal? CUsuarios { get; set; }
    public decimal? CToneladas { get; set; }
    public decimal? CIngresos { get; set; }
    public decimal? CCostos { get; set; }
}

public sealed class DescuentosRequest
{
    public long ProyId { get; set; }
    public long ApsaId { get; set; }
    public List<DescuentosItem> Items { get; set; } = new();
}

public sealed class DescuentosItem
{
    public long? PrdeId { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public decimal? Porcentaje { get; set; }
    public decimal? Valor { get; set; }
}

public sealed class CrecimientoPayload
{
    public List<CrecimientoUsuariosItem> Usuarios { get; set; } = new();
    public List<CrecimientoPropiaItem> Propia { get; set; } = new();
    public List<CrecimientoTercerosItem> Terceros { get; set; } = new();
    public List<DescuentosItem> Descuentos { get; set; } = new();
}
