namespace Veolia.Api.Contracts.Responses;

public sealed class UsuarioPromedioResponse
{
    public decimal Aps { get; set; }
    public decimal Empresa { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public decimal Valor { get; set; }
}

public sealed class UsuarioDetalleResponse
{
    public decimal Aps { get; set; }
    public decimal Empresa { get; set; }
    public decimal Mpio { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public string Tipo { get; set; } = string.Empty;
    public decimal Valor { get; set; }
    public decimal Estado { get; set; }
}
