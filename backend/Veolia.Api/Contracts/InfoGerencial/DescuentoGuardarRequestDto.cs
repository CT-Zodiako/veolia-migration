namespace Veolia.Api.Contracts.InfoGerencial;

public sealed class DescuentoGuardarRequestDto
{
    public int Aps { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public int Id { get; set; }
    public decimal Valor { get; set; }
}
