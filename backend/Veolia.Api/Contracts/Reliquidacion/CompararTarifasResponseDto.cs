namespace Veolia.Api.Contracts.Reliquidacion;

/// <summary>
/// Fila de la vista Oracle RELIQ.VREL_COMPARATARIFACOBRO.
/// Columnas confirmadas contra el legacy Vue (front-tarificador/src/reliq/views/CompararTarifas.vue,
/// líneas 65-637): tríos ORIG/REL/DIF por componente tarifario + acumulados de tarifa plena y cobro/devolución.
/// </summary>
public sealed class CompararTarifasResponseDto
{
    public int? Mes { get; set; }
    public int? Anno { get; set; }
    public string? ClasNombre { get; set; }
    public string? ParaNombre { get; set; }
    public string? FaprNombre { get; set; }

    public decimal? TcOrig { get; set; }
    public decimal? TcRel { get; set; }
    public decimal? TcDif { get; set; }

    public decimal? TcaprovOrig { get; set; }
    public decimal? TcaprovRel { get; set; }
    public decimal? TcaprovDif { get; set; }

    public decimal? TcaddOrig { get; set; }
    public decimal? TcaddRel { get; set; }
    public decimal? TcaddDif { get; set; }

    public decimal? TcaddaprovOrig { get; set; }
    public decimal? TcaddaprovRel { get; set; }
    public decimal? TcaddaprovDif { get; set; }

    public decimal? TblOrig { get; set; }
    public decimal? TblRel { get; set; }
    public decimal? TblDif { get; set; }

    public decimal? TluOrig { get; set; }
    public decimal? TluRel { get; set; }
    public decimal? TluDif { get; set; }

    public decimal? TrtOrig { get; set; }
    public decimal? TrtRel { get; set; }
    public decimal? TrtDif { get; set; }

    public decimal? TdfOrig { get; set; }
    public decimal? TdfRel { get; set; }
    public decimal? TdfDif { get; set; }

    public decimal? TtlOrig { get; set; }
    public decimal? TtlRel { get; set; }
    public decimal? TtlDif { get; set; }

    public decimal? TaOrig { get; set; }
    public decimal? TaRel { get; set; }
    public decimal? TaDif { get; set; }

    public decimal? TarPlenaEneOrg { get; set; }
    public decimal? TarPlenaEneRel { get; set; }
    public decimal? Devolene { get; set; }

    public decimal? TarPlenaAcuOrg { get; set; }
    public decimal? TarPlenaAcuRel { get; set; }
    public decimal? Devolacu { get; set; }
}
