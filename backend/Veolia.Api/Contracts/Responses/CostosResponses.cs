namespace Veolia.Api.Contracts.Responses;

public sealed record ValidapreactualizaResponse(bool PuedeCalcular, IReadOnlyList<string> Mensajes, string AntesLiquidar);

public sealed record PrecheckResultResponse(string Nombre, string Estado, string Mensaje);

public sealed record RunPrechecksResponse(bool PuedeCalcular, IReadOnlyList<PrecheckResultResponse> Prechecks);

public sealed record PasoEjecucionResponse(string Paso, string Estado, string Mensaje);

public sealed record CalculartarifasResponse(bool Exitoso, IReadOnlyList<PasoEjecucionResponse> PasosEjecutados, string Resultado);

public sealed record CertificarTarifasResponse(bool Certificado, DateTime? FechaCertificacion);
