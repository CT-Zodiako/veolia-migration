namespace Veolia.Api.Contracts.Reliquidacion;

/// <summary>
/// JSON real devuelto por reliq.pkrei_aplicarreliquida.fnrei_aplicartodo:
/// {"mensaje":..., "codmes":..., "resultados":{iaed,ined,iare,iuae,cead}}.
/// El PL/SQL puede devolver el JSON doblemente serializado (una cadena que contiene
/// otra cadena JSON); el repositorio intenta un segundo parseo en ese caso, igual que
/// hacía el legacy (tarificador/controller.js:205-218).
/// </summary>
public sealed class AprobarReliquidacionResultadoDto
{
    public string? Mensaje { get; set; }
    public string? Codmes { get; set; }
    public AprobarReliquidacionContadoresDto? Resultados { get; set; }

    /// <summary>Texto crudo devuelto por el PL/SQL, por si el parseo JSON falla o para diagnóstico.</summary>
    public string? RawResultado { get; set; }
}
