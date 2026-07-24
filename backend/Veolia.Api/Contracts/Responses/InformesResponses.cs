namespace Veolia.Api.Contracts.Responses;

public sealed record InformeCostosResponse(string Semestre, IReadOnlyList<InformeDatasetItem> Dataset);

public sealed record InformeDatasetItem(string Nombre, IReadOnlyList<string> Columns, IReadOnlyList<IReadOnlyList<object?>> Data);
