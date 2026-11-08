using System.Text.Json;
using Veolia.Api.Modules.Regulator.Suministros;

namespace Veolia.Api.Tests;

public sealed class CargueComercialContractTests
{
    // Legacy back-tarificador suministros/controller.js:274 inserts CODTIPO with TO_NUMBER(:10) into
    // AUCO_CARGUECOMERCIAL.CCOM_CODTIPO (unconstrained NUMBER): the plano_usuarios file carries the factor
    // there (0.79, 0.86, 0.9, 2.44...), so a decimal CODTIPO must bind instead of failing the request with 400.
    [Fact]
    public void Monthly_cargue_comercial_row_binds_a_decimal_codtipo()
    {
        const string body = """
            {"aps":1020,"anno":2026,"mes":9,"resume":{"n":0,"nd":0,"na":0,"tafna":0},
             "filecontent":[{"codaps":1020,"aps":"PALMIRA","anno":2026,"mes":9,"coduso":1,"nomuso":"ESTRATO 1",
               "codfactor":1,"codtipo":0.79,"tipo":1,"tiponom":"TOTALES","cantidad":0,"toneladas":0}]}
            """;

        var request = JsonSerializer.Deserialize<CargueComercialRequest>(body, new JsonSerializerOptions(JsonSerializerDefaults.Web));

        var fila = Assert.Single(request!.filecontent!);
        Assert.Equal(0.79m, fila.codtipo);
        Assert.Equal(1, fila.codfactor);
        Assert.Equal(1, fila.tipo);
    }
}
