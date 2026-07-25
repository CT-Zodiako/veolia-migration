namespace Veolia.Api.Contracts.Requests;

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
