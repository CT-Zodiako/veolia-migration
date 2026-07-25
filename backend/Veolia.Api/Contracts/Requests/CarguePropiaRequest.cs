namespace Veolia.Api.Contracts.Requests;

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
