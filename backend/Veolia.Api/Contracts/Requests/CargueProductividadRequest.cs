namespace Veolia.Api.Contracts.Requests;

public sealed record CargueProductividadConsultaRequest(int anno, int mes);

public sealed record ProductividadCargueRow(
    int COD_APS,
    string? APS,
    int COD_EMPRESA,
    string? EMPRESA,
    int ANNO,
    int MES,
    decimal? CCS,
    decimal? CBLS,
    decimal? CLUS,
    decimal? CRT,
    decimal? CDF,
    decimal? CTL);

public sealed record CargueProductividadGuardarRequest(
    IReadOnlyList<ProductividadCargueRow>? dataPropios,
    IReadOnlyList<ProductividadCargueRow>? dataTerceros);
