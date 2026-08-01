namespace Veolia.Api.Modules.Reliquidaciones.Contracts;

public sealed class EstadoReliquidacionResponseDto
{
    public bool Ok { get; set; }
    public string Estado { get; set; } = string.Empty;
    public bool PuedeAprobar { get; set; }
}
