using Veolia.Api.Modules.Regulator.Productividad;

namespace Veolia.Api.Tests;

public sealed class ProductividadRepositoryContractTests
{
    // ODP.NET throws reading a NUMBER with more than 28 significant digits into decimal;
    // rounding in SQL to the 6 decimals the legacy screen shows (Productividad.vue redondeo)
    // keeps the value inside decimal range and the JSON field a number.
    [Fact]
    public void Consultar_reads_prod_valor_rounded_to_six_decimals()
    {
        var sql = ProductividadRepository.ConsultarSql;

        Assert.Contains("ROUND(PROD_VALOR, 6) AS ProdValor", sql);
        Assert.DoesNotContain("    PROD_VALOR AS ProdValor", sql);
        Assert.Contains("FROM AUCO_PRODUCTIVIDAD", sql);
        Assert.Contains("WHERE APSA_ID = :aps", sql);
        Assert.Contains("AND PROD_ANNO = :anno", sql);
        Assert.Contains("AND PROD_MES = :mes", sql);
    }
}
