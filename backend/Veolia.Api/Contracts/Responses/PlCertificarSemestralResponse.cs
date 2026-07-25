namespace Veolia.Api.Contracts.Responses;

public sealed record BarridoItem(string Variable, string Valor, string Color);

public sealed record SemestralDataset(IReadOnlyList<decimal> Pgris, IReadOnlyList<BarridoItem> Barrido);

public sealed record PlCertificarSemestralResponse(IReadOnlyList<SemestralDataset> Dataset);
