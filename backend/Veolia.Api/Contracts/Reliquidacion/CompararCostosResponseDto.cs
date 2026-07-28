namespace Veolia.Api.Contracts.Reliquidacion;

/// <summary>
/// Fila de la vista Oracle RELIQ.VREL_COMPARACOSTOS.
/// Columnas confirmadas contra el legacy (back-tarificador/src/modules/reliq/cargue/controller.js,
/// líneas 169-224, y front-tarificador/src/reliq/views/CompararCosto.vue, líneas 34-326):
/// CODRELIQ, APSNOM, COSTANNO, COSTMES + 11 tríos RELQ_X/TARI_X/DIFE_X por componente de costo
/// (CCSENER, CCSENERAPV, CCSACUE, CCSACUEAPV, CBLS, CLUS, CRT, CDF, CTL, VBA, IAT).
/// No existen columnas APSA_ID/RELQDESDE/RELQHASTA/COSTO_APS/COSTO_EMPRESA/DIF_COSTO en esta vista.
/// </summary>
public sealed class CompararCostosResponseDto
{
    public long CodReliq { get; set; }
    public string? ApsNom { get; set; }
    public int? CostAnno { get; set; }
    public int? CostMes { get; set; }

    public decimal? RelqCcsener { get; set; }
    public decimal? TariCcsener { get; set; }
    public decimal? DifeCcsener { get; set; }

    public decimal? RelqCcsenerapv { get; set; }
    public decimal? TariCcsenerapv { get; set; }
    public decimal? DifeCcsenerapv { get; set; }

    public decimal? RelqCcsacue { get; set; }
    public decimal? TariCcsacue { get; set; }
    public decimal? DifeCcsacue { get; set; }

    public decimal? RelqCcsacueapv { get; set; }
    public decimal? TariCcsacueapv { get; set; }
    public decimal? DifeCcsacueapv { get; set; }

    public decimal? RelqCbls { get; set; }
    public decimal? TariCbls { get; set; }
    public decimal? DifeCbls { get; set; }

    public decimal? RelqClus { get; set; }
    public decimal? TariClus { get; set; }
    public decimal? DifeClus { get; set; }

    public decimal? RelqCrt { get; set; }
    public decimal? TariCrt { get; set; }
    public decimal? DifeCrt { get; set; }

    public decimal? RelqCdf { get; set; }
    public decimal? TariCdf { get; set; }
    public decimal? DifeCdf { get; set; }

    public decimal? RelqCtl { get; set; }
    public decimal? TariCtl { get; set; }
    public decimal? DifeCtl { get; set; }

    public decimal? RelqVba { get; set; }
    public decimal? TariVba { get; set; }
    public decimal? DifeVba { get; set; }

    public decimal? RelqIat { get; set; }
    public decimal? TariIat { get; set; }
    public decimal? DifeIat { get; set; }
}
