namespace Veolia.Api.Contracts.Responses;

public sealed record SuiDashboardResponse(IReadOnlyList<object> Filas);

public sealed record SuiFormatoResponse(string Formato, IReadOnlyList<IDictionary<string, object?>> Filas);

public sealed record SuiResumenFormatosResponse(string Formato, IReadOnlyList<object> Filas);

public sealed record SuiProcesarResponse(bool Exitoso, IReadOnlyList<string> FormatosProcesados, string Estado);

public sealed record SuiComplementoResponse(bool Guardado, int FilasAfectadas);

public sealed record SuiPrecheckResponse(bool PuedeProcesar, IReadOnlyList<string> Mensajes);
