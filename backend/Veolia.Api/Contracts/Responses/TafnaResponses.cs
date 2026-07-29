namespace Veolia.Api.Contracts.Responses;

public sealed class TafnaResponse
{
    public decimal Aps { get; set; }
    public decimal Empresa { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public decimal Valor { get; set; }
}
