namespace Veolia.Api.Contracts.Requests;

public sealed record ProductividadRequest(int aps, int anno, int mes, IReadOnlyList<ProductividadItem>? propia, IReadOnlyList<ProductividadItem>? terceros, string? sheetId = null, string? sheetName = null);

public sealed record ProductividadItem(string? codigo, decimal? valor, string? tipo);
