namespace Veolia.Api.Contracts.Reliquidacion;

public sealed class ReliInfoUsuariosDto
{
    public long IuaeId { get; set; }
    public long ReliId { get; set; }
    public long? CodUso { get; set; }
    public long? CodTipoPred { get; set; }
    public decimal Cantidad { get; set; }
    public decimal Toneladas { get; set; }
}
