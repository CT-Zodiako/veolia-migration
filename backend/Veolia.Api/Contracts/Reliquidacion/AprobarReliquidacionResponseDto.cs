namespace Veolia.Api.Contracts.Reliquidacion;

public sealed class AprobarReliquidacionResponseDto
{
    public bool Ok { get; set; }
    public string Mensaje { get; set; } = string.Empty;
    public AprobarReliquidacionResultadoDto? Resultado { get; set; }
}
