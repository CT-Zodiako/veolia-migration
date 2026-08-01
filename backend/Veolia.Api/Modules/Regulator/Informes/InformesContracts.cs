namespace Veolia.Api.Modules.Regulator.Informes;

public sealed record InformeCostosResponse(string Semestre, IReadOnlyList<InformeDatasetItem> Dataset);

public sealed record InformeDatasetItem(string Nombre, IReadOnlyList<string> Columns, IReadOnlyList<IReadOnlyList<object?>> Data);
