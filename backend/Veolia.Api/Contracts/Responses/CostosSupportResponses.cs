namespace Veolia.Api.Contracts.Responses;

public class CostoItemResponse
{
    public int ApsId { get; set; }
    public int Mes { get; set; }
    public int Anno { get; set; }
    public decimal CostValor { get; set; }
    public string CostTipo { get; set; } = string.Empty;
    public DateTime CostFecha { get; set; }
}

public class CostoClusItemResponse
{
    public int ApsaId { get; set; }
    public int CostAnno { get; set; }
    public int CostMes { get; set; }
    public int ParaCosto20021 { get; set; }
    public string ParaNombre { get; set; } = string.Empty;
    public decimal CostValor { get; set; }
}

public class ComportaClusItemResponse
{
    public int ApsaId { get; set; }
    public int InedAnno { get; set; }
    public int InedMes { get; set; }
    public decimal InedCp { get; set; }
    public decimal InedM2ccj { get; set; }
    public decimal InedM2lavj { get; set; }
    public decimal InedTij { get; set; }
    public decimal InedKlpj { get; set; }
    public decimal InedTmj { get; set; }
}
