using System.ComponentModel.DataAnnotations;

namespace Veolia.Api.Contracts.Requests;

public sealed class PeriodoRequest
{
    [Range(1900, 2100, ErrorMessage = "La vigencia debe estar entre 1900 y 2100.")]
    public int? Vigencia { get; init; }
}

public sealed class MunicipioRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "El departamento es obligatorio.")]
    public int DepartamentoId { get; init; }
}

public sealed class PrestadorRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "El municipio es obligatorio.")]
    public int MunicipioId { get; init; }

    [MaxLength(120, ErrorMessage = "El filtro no puede superar 120 caracteres.")]
    public string? Filtro { get; init; }
}

public sealed class CrearCargueRequest
{
    [Range(1, int.MaxValue)] public int PeriodoId { get; init; }
    [Range(1, int.MaxValue)] public int MunicipioId { get; init; }
    [Range(1, int.MaxValue)] public int PrestadorId { get; init; }
    [Range(1, int.MaxValue)] public int TipoCargueId { get; init; }
    [Required, MaxLength(60)] public string Usuario { get; init; } = string.Empty;
}

public sealed class ParsearArchivoRequest
{
    [MaxLength(2, ErrorMessage = "El separador es inválido.")]
    public string? Separador { get; init; }

    [MaxLength(80, ErrorMessage = "La hoja no puede superar 80 caracteres.")]
    public string? Hoja { get; init; }
}

public sealed class ConfirmarCargueRequest
{
    [Required, MaxLength(60)]
    public string Usuario { get; init; } = string.Empty;
}

public sealed class RevertirCargueRequest
{
    [Required, MinLength(10), MaxLength(500)]
    public string Motivo { get; init; } = string.Empty;

    [Required, MaxLength(60)]
    public string Usuario { get; init; } = string.Empty;
}

public sealed class EjecutarValidacionRequest
{
    [Range(1, long.MaxValue)]
    public long CargueId { get; init; }

    public IReadOnlyList<string>? Reglas { get; init; }
}

public sealed class EjecutarCertificacionRequest
{
    [Range(1, long.MaxValue)]
    public long CargueId { get; init; }

    [Required, MaxLength(60)]
    public string Usuario { get; init; } = string.Empty;

    public bool Forzar { get; init; }
}
