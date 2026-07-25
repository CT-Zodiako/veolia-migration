namespace Veolia.Api.Contracts.Requests;

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
