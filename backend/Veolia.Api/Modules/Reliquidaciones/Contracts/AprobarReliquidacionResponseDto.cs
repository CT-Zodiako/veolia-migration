namespace Veolia.Api.Modules.Reliquidaciones.Contracts;

public sealed class AprobarReliquidacionResponseDto
{
    public bool Ok { get; set; }
    public string Mensaje { get; set; } = string.Empty;
    public AprobarReliquidacionResultadoDto? Resultado { get; set; }
}
