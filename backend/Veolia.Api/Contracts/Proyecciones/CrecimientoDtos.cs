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

// PROY_USUARIOS no tiene ID sustituto -- clave natural (PROY_ID, COD_APS, ANNO,
// SEMESTRE, CODTIPOPRED, CODUSO). PROY_ID/COD_APS vienen del request wrapper.
public sealed class CrecimientoUsuariosItem
{
    public int Anno { get; set; }
    public int Semestre { get; set; }
    public decimal? Coduso { get; set; }
    public string? Nomclaseuso { get; set; }
    public decimal? Codfactor { get; set; }
    public decimal? Valorfactor { get; set; }
    public decimal? Codtipopred { get; set; }
    public string? Nomtipopred { get; set; }
    public decimal? Cantidad { get; set; }
    public decimal? Toneladas { get; set; }
}

public sealed class CrecimientoPropiaRequest
{
    public long ProyId { get; set; }
    public long ApsaId { get; set; }
    public List<CrecimientoPropiaItem> Items { get; set; } = new();
}

// PROY_PROPIA: sin ID sustituto. Legacy real (registrarcrecimientoinfpropia) --
// las decenas de columnas V_* no tienen equivalente de "usuarios/toneladas/
// ingresos/costos" genérico, son variables de negocio específicas del cálculo
// de tarifas propias.
public sealed class CrecimientoPropiaItem
{
    public string? NomAps { get; set; }
    public decimal? CodEmpresa { get; set; }
    public string? NomEmpresa { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    // Únicas dos columnas de PROY_PROPIA que el INSERT legacy NO envuelve en
    // TO_NUMBER() -- son texto ("SI"/"NO"), no numéricas.
    public string? VDispterc { get; set; }
    public string? Iat { get; set; }
    public decimal? VN { get; set; }
    public decimal? VNa { get; set; }
    public decimal? VNd { get; set; }
    public decimal? VTafna { get; set; }
    public decimal? VQrt { get; set; }
    public decimal? VQlu { get; set; }
    public decimal? VQna { get; set; }
    public decimal? VQbl { get; set; }
    public decimal? VQr { get; set; }
    public decimal? VQrs { get; set; }
    public decimal? VCblj { get; set; }
    public decimal? VLbl { get; set; }
    public decimal? VValorMts3 { get; set; }
    public decimal? VM2cc { get; set; }
    public decimal? VM2lav { get; set; }
    public decimal? VTi { get; set; }
    public decimal? VTm { get; set; }
    public decimal? VKlp { get; set; }
    public decimal? VVl { get; set; }
    public decimal? VEscenario { get; set; }
    public decimal? VCtlmx { get; set; }
    public decimal? VT { get; set; }
    public decimal? VCpe { get; set; }
    public decimal? VVaCrt { get; set; }
    public decimal? VVaCrtAbc { get; set; }
    public decimal? VVaCdf { get; set; }
    public decimal? VVaCdfAbc { get; set; }
    public decimal? VNaa { get; set; }
    public decimal? VQa { get; set; }
    public decimal? VTafa { get; set; }
    public decimal? VCp { get; set; }
    public decimal? VCrtPropio { get; set; }
    public decimal? VCdfFacturado { get; set; }
    public decimal? VQrtz { get; set; }
    public decimal? VCdfTercero { get; set; }
    public decimal? VCtlTercero { get; set; }
    public decimal? VIrTercero { get; set; }
    public decimal? VQrsMunrecp { get; set; }
}

public sealed class CrecimientoTercerosRequest
{
    public long ProyId { get; set; }
    public long ApsaId { get; set; }
    public List<CrecimientoTercerosItem> Items { get; set; } = new();
}

// PROY_COMPETIDOR: sin ID sustituto. Mismo criterio que PROY_PROPIA pero con
// las columnas C_* (variables del competidor/tercero).
public sealed class CrecimientoTercerosItem
{
    public string? NomAps { get; set; }
    public decimal? CodEmpresa { get; set; }
    public string? NomEmpresa { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public decimal? CN { get; set; }
    public decimal? CNa { get; set; }
    public decimal? CNd { get; set; }
    public decimal? CTafna { get; set; }
    public decimal? CValorMts3 { get; set; }
    public decimal? CQrt { get; set; }
    public decimal? CQlu { get; set; }
    public decimal? CQna { get; set; }
    public decimal? CQbl { get; set; }
    public decimal? CQrechazo { get; set; }
    public decimal? CQrs { get; set; }
    public decimal? CCblj { get; set; }
    public decimal? CLbl { get; set; }
    public decimal? CM2cc { get; set; }
    public decimal? CM2lav { get; set; }
    public decimal? CTi { get; set; }
    public decimal? CTm { get; set; }
    public decimal? CKlp { get; set; }
    public decimal? CVl { get; set; }
    public decimal? CEscenario { get; set; }
    public decimal? CT { get; set; }
    public decimal? CCpe { get; set; }
    public decimal? CCtlmx { get; set; }
    public decimal? CVaCrt { get; set; }
    public decimal? CVaCrtAbc { get; set; }
    public decimal? CVaCdf { get; set; }
    public decimal? CVaCdfAbc { get; set; }
    public decimal? CNaa { get; set; }
    public decimal? CQa { get; set; }
    public decimal? CTafa { get; set; }
    public decimal? CCrtCompetidor { get; set; }
    public decimal? CCdfCompetidor { get; set; }
    public decimal? CQrtz { get; set; }
    public decimal? CCtlSinIncentivo { get; set; }
    public decimal? CIncentivo { get; set; }
    public decimal? CCdfsincentivo { get; set; }
    public decimal? CCpoda { get; set; }
}

public sealed class DescuentosRequest
{
    public long ProyId { get; set; }
    public long ApsaId { get; set; }
    public List<DescuentosItem> Items { get; set; } = new();
}

// PROY_DESCUENTOS: sin ID sustituto, clave natural (PROY_ID, ANNO, MES).
public sealed class DescuentosItem
{
    public string? NomAps { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public decimal? Dccs { get; set; }
    public decimal? Dcbl { get; set; }
    public decimal? Dclus { get; set; }
    public decimal? Dcrt { get; set; }
    public decimal? Dcdf { get; set; }
    public decimal? Dctl { get; set; }
    public decimal? Dvba { get; set; }
}

public sealed class CrecimientoPayload
{
    public List<CrecimientoUsuariosItem> Usuarios { get; set; } = new();
    public List<CrecimientoPropiaItem> Propia { get; set; } = new();
    public List<CrecimientoTercerosItem> Terceros { get; set; } = new();
    public List<DescuentosItem> Descuentos { get; set; } = new();
}
