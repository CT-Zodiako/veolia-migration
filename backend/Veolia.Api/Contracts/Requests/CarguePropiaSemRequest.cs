namespace Veolia.Api.Contracts.Requests;

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
