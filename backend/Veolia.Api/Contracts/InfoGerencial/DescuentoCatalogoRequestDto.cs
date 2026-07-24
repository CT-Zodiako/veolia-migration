namespace Veolia.Api.Contracts.InfoGerencial;

public sealed class DescuentoCatalogoRequestDto
{
    public int Id { get; set; }
    public int Aps { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public bool IsNew { get; set; }
}
