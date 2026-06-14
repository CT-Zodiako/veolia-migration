namespace Veolia.Api.Contracts.Responses;

public sealed class RellenoResponse
{
    public long RELL_ID { get; set; }
    public string RELL_NOMRELLENO { get; set; } = string.Empty;
    public string? RELL_DESCRIPCION { get; set; }
    public int RELL_ESTADO { get; set; }
    public int RELL_PROPIO { get; set; }
    public int RELL_REGIONAL { get; set; }
    public string? RELL_NUSD { get; set; }
    public DateTime RELL_FECHACREACION { get; set; }
    public long USUA_USUA { get; set; }
}
