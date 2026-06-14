namespace Veolia.Api.Contracts.Responses;

public sealed class QrtResponse
{
    public decimal Aps { get; set; }
    public decimal Empresa { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public decimal Valor { get; set; }
}

public sealed class QaResponse
{
    public decimal Aps { get; set; }
    public decimal Empresa { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public decimal Valor { get; set; }
}

public sealed class DetalleResponse
{
    public decimal Aps { get; set; }
    public decimal Empresa { get; set; }
    public decimal Mpio { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public decimal Valor { get; set; }
}
