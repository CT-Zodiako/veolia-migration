namespace Veolia.Api.Contracts.Responses;

public sealed class TrnaResponse
{
    public decimal ApsaId { get; set; }
    public decimal EmprEmpr { get; set; }
    public decimal DiviDivi { get; set; }
    public string ApsaNomaps { get; set; } = string.Empty;
    public string FaprNombre { get; set; } = string.Empty;
    public decimal FaprCodigo { get; set; }
    public decimal FaprValor { get; set; }
    public decimal Trna { get; set; }
}
