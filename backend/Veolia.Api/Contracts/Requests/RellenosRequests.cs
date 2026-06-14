namespace Veolia.Api.Contracts.Requests;

public sealed class RellenoRequest
{
    public long rell_id { get; set; }
}

public sealed class CrearRellenoRequest
{
    public string rell_nomrelleno { get; set; } = string.Empty;
    public string? rell_descripcion { get; set; }
    public int rell_estado { get; set; } = 1;
    public int rell_propio { get; set; }
    public int rell_regional { get; set; }
    public string? rell_nusd { get; set; }
}

public sealed class EditarRellenoRequest
{
    public string rell_nomrelleno { get; set; } = string.Empty;
    public string? rell_descripcion { get; set; }
    public int rell_estado { get; set; } = 1;
    public int rell_propio { get; set; }
    public int rell_regional { get; set; }
    public string? rell_nusd { get; set; }
}
