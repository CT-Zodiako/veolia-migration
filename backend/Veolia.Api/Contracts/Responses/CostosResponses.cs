namespace Veolia.Api.Contracts.Responses;

public sealed record VerificacionDetalleResponse(string EmpresaNombre, string Grupo, string Variable, decimal Valor, decimal EmpresaPropia);

public sealed record ValidapreactualizaResponse(bool PuedeCalcular, IReadOnlyList<VerificacionDetalleResponse> Detalle);

public sealed record PrecheckResultResponse(string Nombre, string Estado, string Mensaje);

public sealed record RunPrechecksResponse(bool PuedeCalcular, IReadOnlyList<PrecheckResultResponse> Prechecks);

public sealed record CalculartarifasResponse(bool Exitoso, string Resultado);

public sealed record CertificarTarifasResponse(bool Certificado, DateTime? FechaCertificacion);
