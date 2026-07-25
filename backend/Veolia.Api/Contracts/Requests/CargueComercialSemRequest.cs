namespace Veolia.Api.Contracts.Requests;

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
