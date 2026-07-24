namespace Veolia.Api.Contracts.Productividad;

public sealed class ProductividadConsultaRequestDto
{
    public int Aps { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
}

public sealed class ProductividadCrearRequestDto
{
    public int Aps { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public decimal Valor { get; set; }
}

public sealed class ProductividadEditarRequestDto
{
    public int Aps { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public decimal Valor { get; set; }
}

public sealed class ProductividadResponseDto
{
    public int ApsaId { get; set; }
    public int ProdAnno { get; set; }
    public int ProdMes { get; set; }
    public decimal ProdValor { get; set; }
}
