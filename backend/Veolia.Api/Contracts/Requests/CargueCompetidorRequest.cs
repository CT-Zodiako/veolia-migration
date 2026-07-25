namespace Veolia.Api.Contracts.Requests;

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
