using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Infrastructure.GoogleDrive;
using Veolia.Api.Modules.Sui853.Configuracion;

namespace Veolia.Api.Tests;

/// <summary>
/// End-to-end contract of the SUI853 Drive loads through the real Program pipeline
/// (deny-by-default JWT middleware + controller system check). Google and Oracle are stubbed.
/// </summary>
public sealed class Sui853DriveLoadsContractTests
{
    private sealed class DriveLoadsFactory : WebApplicationFactory<Program>
    {
        public Sui853DriveLoadsTests.SpyRepository Repository { get; } = new();
        public Sui853DriveLoadsTests.StubHarvest Harvest { get; } = new();

        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
            builder.ConfigureServices(services =>
            {
                services.RemoveAll<IOracleConnectionFactory>();
                services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
                services.RemoveAll<ISui853DriveLoadsRepository>();
                services.AddSingleton<ISui853DriveLoadsRepository>(Repository);
                services.RemoveAll<IGoogleDriveHarvestService>();
                services.AddSingleton<IGoogleDriveHarvestService>(Harvest);
            });
        }
    }

    public static TheoryData<string, object> Routes => new()
    {
        { "cargueResiduos", new { apsId = 7, anno = 2024 } },
        { "cargueFacturacion", new { apsId = 7, anno = 2024 } },
        { "cargueFacturacion", new { apsId = 7, anno = 2024, mes = "Abril" } }
    };

    [Theory]
    [MemberData(nameof(Routes))]
    public async Task MissingOrForgedTokenIsRejectedBeforeDriveOrDatabaseAccess(string route, object body)
    {
        using var factory = new DriveLoadsFactory();
        using var client = factory.CreateClient();

        var missing = await client.PostAsJsonAsync("/api/v1/sui853Configuracion/" + route, body);
        // Legacy authJwt parity: no token → 403, invalid token → 401.
        Assert.Equal(HttpStatusCode.Forbidden, missing.StatusCode);

        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.BuildUnsigned(101, 3));
        var forged = await client.PostAsJsonAsync("/api/v1/sui853Configuracion/" + route, body);
        Assert.Equal(HttpStatusCode.Unauthorized, forged.StatusCode);

        Assert.False(factory.Repository.Called);
        Assert.Null(factory.Harvest.Request);
    }

    [Theory]
    [MemberData(nameof(Routes))]
    public async Task ValidTokenOfAnotherSystemIsForbidden(string route, object body)
    {
        using var factory = new DriveLoadsFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(101, idSistema: 2));

        var response = await client.PostAsJsonAsync("/api/v1/sui853Configuracion/" + route, body);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.False(factory.Repository.Called);
        Assert.Null(factory.Harvest.Request);
    }

    [Fact]
    public async Task Sui853UserLoadsFacturacionMonthThroughThePipeline()
    {
        using var factory = new DriveLoadsFactory();
        factory.Harvest.Files = [Sui853DriveLoadsTests.File("Salamina-SUI Abril 2024", "sui-facturacion",
            new Dictionary<string, object?> { ["NUIS_ASEO"] = "U1", ["TRLU"] = "2.5" })];
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(101, idSistema: 3));

        var response = await client.PostAsJsonAsync("/api/v1/sui853Configuracion/cargueFacturacion", new { apsId = 7, anno = 2024, mes = "Abril" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var data = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        Assert.True(data.GetProperty("ok").GetBoolean());
        Assert.Equal(1, data.GetProperty("inserted").GetInt32());
        Assert.Equal("Abril", factory.Harvest.Request!.Month);
        Assert.Equal([new DriveLoadPeriod(7, 2024, 4)], factory.Repository.Periods);
    }

    [Fact]
    public async Task Sui853UserGetsValidationDetailThroughThePipeline()
    {
        using var factory = new DriveLoadsFactory();
        var bad = Sui853DriveLoadsTests.ResiduoRow(); bad["TONELADAS RECOGIDAS BARRIDO URBANO"] = "1,5";
        factory.Harvest.Files = [Sui853DriveLoadsTests.File("Salamina 2024", "Hoja SUI Recolección", bad)];
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(101, idSistema: 3));

        var response = await client.PostAsJsonAsync("/api/v1/sui853Configuracion/cargueResiduos", new { apsId = 7, anno = 2024 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var data = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("data");
        Assert.Equal("VALIDATION_ERROR", data.GetProperty("type").GetString());
        Assert.Equal(2, data.GetProperty("rowNumber").GetInt32());
        Assert.Equal("TON_RBU", data.GetProperty("validation").GetProperty("columna").GetString());
        Assert.Null(factory.Repository.Target);
    }
}
