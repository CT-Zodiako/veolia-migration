using System.ComponentModel.DataAnnotations;

namespace Veolia.Api.Modules.Regulator.Costos;

public sealed class ValidapreactualizaRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "El APS es obligatorio.")]
    public int Aps { get; init; }

    [Range(1, 12, ErrorMessage = "El mes debe estar entre 1 y 12.")]
    public int Mes { get; init; }

    [Range(2000, 2999, ErrorMessage = "El año debe estar entre 2000 y 2999.")]
    public int Anno { get; init; }

    [Range(1, int.MaxValue, ErrorMessage = "El usuario es obligatorio.")]
    public int Usuario { get; init; }
}

public sealed class CalculartarifasRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "El APS es obligatorio.")]
    public int Aps { get; init; }

    [Range(1, 12, ErrorMessage = "El mes debe estar entre 1 y 12.")]
    public int Mes { get; init; }

    [Range(2000, 2999, ErrorMessage = "El año debe estar entre 2000 y 2999.")]
    public int Anno { get; init; }

    [Range(1, int.MaxValue, ErrorMessage = "El usuario es obligatorio.")]
    public int Usuario { get; init; }
}

public sealed class CertificarTarifasRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "El APS es obligatorio.")]
    public int Aps { get; init; }

    [Range(1, 12, ErrorMessage = "El mes debe estar entre 1 y 12.")]
    public int Mes { get; init; }

    [Range(2000, 2999, ErrorMessage = "El año debe estar entre 2000 y 2999.")]
    public int Anno { get; init; }

    [Range(1, int.MaxValue, ErrorMessage = "El usuario es obligatorio.")]
    public int Usuario { get; init; }
}

public sealed class CostoConsultaRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "El APS es obligatorio.")]
    public int Aps { get; init; }

    [Range(1, 12, ErrorMessage = "El mes debe estar entre 1 y 12.")]
    public int Mes { get; init; }

    [Range(2000, 2999, ErrorMessage = "El año debe estar entre 2000 y 2999.")]
    public int Anno { get; init; }
}

public sealed record VerificacionDetalleResponse(string EmpresaNombre, string Grupo, string Variable, decimal Valor, decimal EmpresaPropia);

public sealed record ValidapreactualizaResponse(bool PuedeCalcular, IReadOnlyList<VerificacionDetalleResponse> Detalle);

public sealed record PrecheckResultResponse(string Nombre, string Estado, string Mensaje);

public sealed record RunPrechecksResponse(bool PuedeCalcular, IReadOnlyList<PrecheckResultResponse> Prechecks);

public sealed record CalculartarifasResponse(bool Exitoso, string Resultado);

public sealed record CertificarTarifasResponse(bool Certificado, DateTime? FechaCertificacion);

public class CostoItemResponse
{
    public int ApsCosto { get; set; }
    public int EmpresaCosto { get; set; }
    public int CodCosto { get; set; }
    public string NomCosto { get; set; } = string.Empty;
    public int AnnoCosto { get; set; }
    public int MesCosto { get; set; }
    public decimal? ACobrar { get; set; }
    public decimal? Valor { get; set; }
    public decimal? Variacion { get; set; }
}

public class CostoClusItemResponse
{
    public int ApsaId { get; set; }
    public int CostAnno { get; set; }
    public int CostMes { get; set; }
    public int ParaCosto20021 { get; set; }
    public string ParaNombre { get; set; } = string.Empty;
    public decimal CostValor { get; set; }
}

public class ComportaClusItemResponse
{
    public int ApsaId { get; set; }
    public int InedAnno { get; set; }
    public int InedMes { get; set; }
    public decimal InedCp { get; set; }
    public decimal InedM2ccj { get; set; }
    public decimal InedM2lavj { get; set; }
    public decimal InedTij { get; set; }
    public decimal InedKlpj { get; set; }
    public decimal InedTmj { get; set; }
}

