namespace Veolia.Api.Contracts.Responses;

public sealed record ApiEnvelopeResponse<T>(string Status, T Data, string Message, string? TraceId = null, string? OraCode = null);

public sealed class CatalogoItemResponse
{
    public int Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
}
public sealed record CrearCargueResponse(long CargueId, string Estado);
public sealed record ErrorFilaResponse(int Fila, string Campo, string Error);
public sealed record SubirArchivoResponse(long ArchivoId, int FilasLeidas, int FilasInvalidas, IReadOnlyList<ErrorFilaResponse> Errores);
public sealed record ParsearArchivoResponse(int FilasTotales, int FilasValidas, int FilasInvalidas, IReadOnlyList<ErrorFilaResponse> DetalleErrores);
public sealed record ResumenCargueResponse(long CargueId, string Estado, int FilasTotales, int FilasValidas, int FilasInvalidas);
public sealed record ErrorCargueItemResponse(int Fila, string Campo, string Mensaje);
public sealed record ErroresCargueResponse(IReadOnlyList<ErrorCargueItemResponse> Items, int Total, int Page, int Size);
public sealed record ConfirmarCargueResponse(bool Confirmado, DateTime Fecha);
public sealed record EjecutarValidacionResponse(long ValidacionId, string Estado, string Resumen);
public sealed record EstadoValidacionResponse(long ValidacionId, string Estado, int Totales, IReadOnlyList<ErrorCargueItemResponse> Errores);
public sealed record EjecutarCertificacionResponse(long EjecucionId, string Estado);
public sealed record EstadoEjecucionResponse(long EjecucionId, string Estado, int Progreso, string Resultado);
public sealed record ResultadoCertificacionItemResponse(string Regla, string Estado, string Detalle);
public sealed record ResultadosCertificacionResponse(IReadOnlyList<ResultadoCertificacionItemResponse> Items, int Totales);
public sealed record RevertirCargueResponse(bool Revertido);
public sealed record PlantillaResponse(string FileName, string ContentType, string Base64);
