namespace Veolia.Api.Modules.Regulator.Suministros;

public sealed record CargueComercialResumen(decimal n, decimal nd, decimal na, decimal tafna);

public sealed record CargueComercialFila(
    int codaps,
    string? aps,
    int anno,
    int mes,
    int coduso,
    string? nomuso,
    int codfactor,
    int codtipo,
    int tipo,
    string? tiponom,
    decimal cantidad,
    decimal toneladas);

public sealed record CargueComercialRequest(int aps, int anno, int mes, CargueComercialResumen resume, IReadOnlyList<CargueComercialFila>? filecontent);

public sealed record CargueComercialSemFila(
    int codaps,
    string? aps,
    int anno,
    int semestre,
    int coduso,
    string? nomuso,
    int codfactor,
    int nomfact,
    int codtipo,
    string? nomtipo,
    decimal susm1,
    decimal susm2,
    decimal susm3,
    decimal susm4,
    decimal susm5,
    decimal susm6,
    decimal afom1,
    decimal afom2,
    decimal afom3,
    decimal afom4,
    decimal afom5,
    decimal afom6);

public sealed record CargueComercialSemRequest(IReadOnlyList<CargueComercialSemFila>? filecontent);

public sealed record CargueCompetidorFila(
    int aps,
    int empr,
    int anno,
    int mes,
    decimal cp,
    decimal mt3agua,
    decimal m2cc,
    decimal m2lav,
    decimal ti,
    decimal tm,
    decimal klp,
    decimal cblj);

public sealed record CargueCompetidorRequest(int aps, CargueEmpresaRef? empr, int anno, int mes, IReadOnlyList<CargueCompetidorFila>? resumemes);

public sealed record CargueCompetidorSemFila(
    int aps,
    int empr,
    int anno,
    int mes,
    decimal n,
    decimal na,
    decimal nd,
    decimal qlu,
    decimal qna,
    decimal qbl,
    decimal qr,
    decimal cblj,
    decimal lbl,
    decimal crtcomp,
    decimal cdfcomp,
    decimal qrtz);

public sealed record CargueCompetidorSemRequest(IReadOnlyList<CargueCompetidorSemFila>? resumesem);

public sealed record CargueEmpresaRef(int emprempr, string? emprnombre);

public sealed record CarguePropiaFila(
    int aps,
    int empr,
    int anno,
    int mes,
    decimal cp,
    decimal mt3agua,
    decimal m2cc,
    decimal m2lav,
    decimal ti,
    decimal tm,
    decimal klp,
    decimal t,
    decimal qa,
    decimal escenario);

public sealed record CarguePropiaRequest(int aps, CargueEmpresaRef? empr, int anno, int mes, IReadOnlyList<CarguePropiaFila>? resumemes);

public sealed record CarguePropiaSemFila(
    int aps,
    int empr,
    int anno,
    int mes,
    decimal qrt,
    decimal qlu,
    decimal qna,
    decimal qbl,
    decimal qr,
    decimal qrs,
    decimal lbl,
    decimal vl,
    decimal esce,
    decimal ctlmx,
    decimal cpe,
    decimal naa,
    decimal tafa,
    decimal crtpro,
    decimal cdfpro,
    decimal qrsmunrecp);

public sealed record CarguePropiaSemRequest(IReadOnlyList<CarguePropiaSemFila>? resumesem);

public sealed record CertificarSemestralRequest(int aps, int anno, int semestre);

public sealed record PrevalidarRequest(int aps, int anno, int mes);

public sealed record PrevalidarSemestralRequest(int aps, int anno, int semestre);

public sealed record QRTRuralRequest(int aps, int anno, int semestre, decimal qrtRural);

public sealed record TercerosRequest(int aps, int anno, int mes, decimal cdf, decimal ctl, decimal incentivo);

public sealed record BarridoItem(string Variable, string Valor, string Color);

public sealed record SemestralDataset(IReadOnlyList<decimal> Pgris, IReadOnlyList<BarridoItem> Barrido);

public sealed record PlCertificarSemestralResponse(IReadOnlyList<SemestralDataset> Dataset);

public sealed record PodaConsultaRequest(int aps, int anno, int mes);

public sealed record PodaCatalogoRequest(int aps);

public sealed record PodaNuevoItem(int EMPR_EMPR, string? EMPR_NOMBRE, decimal valor);

public sealed record PodaNuevoRequest(IReadOnlyList<PodaNuevoItem> datos, int aps, int anno, int mes);

public sealed record PodaEditarRequest(int EMPR_EMPR, decimal CPTE_VALORSUI, int apsa_id, int cpte_anno, int cpte_mes);
