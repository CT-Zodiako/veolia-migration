using System.Net;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Sui853.Cft;

namespace Veolia.Api.Tests;

public sealed class Sui853CftContractTests
{
    // Legacy back-tarificador/src/modules/sui853/{CFT,CVNA,CVA}/routes.js: one hardcoded format code per route.
    public static TheoryData<string, string> Routes => new()
    {
        { "cft", "F853S105" },
        { "cft-seg2", "F853S209" },
        { "cft-seg3", "F853S306" },
        { "css-aprovechamiento", "F853001" },
        { "css-aprovechamiento-seg2", "F853S201" },
        { "css-aprovechamiento-seg3", "F853S301" },
        { "crlus", "F853002" },
        { "cbls", "F853003" },
        { "cblus-minimo", "F853S202" },
        { "cblus-maximo", "F853S203" },
        { "cblus", "F853S204" },
        { "cbics-maxmin", "F853S208" },
        { "crts-minimo", "F853S102" },
        { "crts-minimo-seg2", "F853S205" },
        { "crts-minimo-seg3", "F853S302" },
        { "crts-maximo", "F853S103" },
        { "crts-maximo-seg2", "F853S206" },
        { "crts-maximo-seg3", "F853S303" },
        { "crt", "F853S106" },
        { "crt-seg2", "F853S211" },
        { "crt-seg3", "F853S307" },
        { "cvna", "F853S107" },
        { "cvna-seg2", "F853S210" },
        { "cvna-seg3", "F853S305" },
        { "cva", "F853S104" },
        { "cva-seg2", "F853S207" },
        { "cva-seg3", "F853S304" }
    };

    [Theory]
    [MemberData(nameof(Routes))]
    public async Task RouteRendersItsLegacyFormatCodeLosslessly(string route, string codigo)
    {
        using var factory = new Sui853CftApiFactory();
        using var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build());

        var response = await client.PostAsync($"/api/v1/sui853/cft/{route}", new StringContent("{}", System.Text.Encoding.UTF8, "application/json"));
        var body = await ReadJson(response);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal([codigo], factory.Repository.Codigos);
        Assert.Equal("success", body.GetProperty("status").GetString());
        Assert.False(string.IsNullOrWhiteSpace(body.GetProperty("message").GetString()));
        var data = body.GetProperty("data");
        Assert.Equal(codigo, data.GetProperty("title").GetString());
        Assert.Equal($"{codigo} | Nombre | Descripcion", data.GetProperty("meta").GetProperty("dialogHeader").GetString());
        Assert.Equal("F_CODE", data.GetProperty("SIN_MOVIMIENTO").GetProperty("headersConFiltro")[0].GetProperty("field").GetString());
        Assert.Equal("kept", data.GetProperty("extra").GetString());
        Assert.Equal(1.23456789012345678m, data.GetProperty("data")[0].GetProperty("F_CODE").GetDecimal());
    }

    // Legacy verifyToken: missing token -> 403, invalid token -> 401; the repository is never reached.
    [Theory]
    [MemberData(nameof(Routes))]
    public async Task RouteRejectsMissingOrInvalidTokenBeforeRepositoryAccess(string route, string codigo)
    {
        using var factory = new Sui853CftApiFactory();
        using var client = factory.CreateClient();
        var url = $"/api/v1/sui853/cft/{route}";

        var missing = await client.PostAsync(url, new StringContent("{}", System.Text.Encoding.UTF8, "application/json"));
        using var unsignedRequest = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json")
        };
        unsignedRequest.Headers.Add("x-access-token", TestJwt.BuildUnsigned());
        var unsigned = await client.SendAsync(unsignedRequest);

        Assert.Equal(HttpStatusCode.Forbidden, missing.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, unsigned.StatusCode);
        Assert.Equal("No Autorizado!", (await ReadJson(unsigned)).GetProperty("message").GetString());
        Assert.Empty(factory.Repository.Codigos);
        Assert.False(string.IsNullOrEmpty(codigo));
    }

    // F1: f_render_formato2 keys that the old DTO did not model must survive.
    [Fact]
    public void ParseKeepsUnknownKeysAndExistingMeta()
    {
        const string json = """{"title":"SG1 - CVA","meta":{"other":true},"SIN_MOVIMIENTO":{"tableTitle":"T","headersConFiltro":[{"field":"A","filter":true}],"headersSinFiltro":[{"field":"B"}],"custom":1},"CON_MOVIMIENTO":{"headers":[{"field":"C","mouse_over":"x {value}"}]},"data":[{"A":null,"B":"b","C":123456789.123456789}],"extra":"kept"}""";

        var payload = Formato2Payload.Parse(json)!;
        Formato2Payload.ApplyDialogHeader(payload, "F853S104 | SG1 - CVA | Generado");
        var result = JsonSerializer.SerializeToElement(payload);

        Assert.Equal("SG1 - CVA", result.GetProperty("title").GetString());
        Assert.True(result.GetProperty("meta").GetProperty("other").GetBoolean());
        Assert.Equal("F853S104 | SG1 - CVA | Generado", result.GetProperty("meta").GetProperty("dialogHeader").GetString());
        Assert.Equal("A", result.GetProperty("SIN_MOVIMIENTO").GetProperty("headersConFiltro")[0].GetProperty("field").GetString());
        Assert.Equal("B", result.GetProperty("SIN_MOVIMIENTO").GetProperty("headersSinFiltro")[0].GetProperty("field").GetString());
        Assert.Equal(1, result.GetProperty("SIN_MOVIMIENTO").GetProperty("custom").GetInt32());
        Assert.Equal("x {value}", result.GetProperty("CON_MOVIMIENTO").GetProperty("headers")[0].GetProperty("mouse_over").GetString());
        Assert.Equal(JsonValueKind.Null, result.GetProperty("data")[0].GetProperty("A").ValueKind);
        Assert.Equal(123456789.123456789m, result.GetProperty("data")[0].GetProperty("C").GetDecimal());
        Assert.Equal("kept", result.GetProperty("extra").GetString());
    }

    // F2: legacy controller.js falls back to JSON.parse(JSON.parse(raw)) for double-encoded output.
    [Fact]
    public void ParseAcceptsDoubleEncodedJson()
    {
        const string json = """{"title":"SG2 - CFT","data":[{"X":1}],"meta":{"k":"v"}}""";

        var payload = Formato2Payload.Parse(JsonSerializer.Serialize(json))!;

        Assert.Equal("SG2 - CFT", payload["title"]!.GetValue<string>());
        Assert.Equal("v", payload["meta"]!["k"]!.GetValue<string>());
        Assert.Equal(1, payload["data"]![0]!["X"]!.GetValue<int>());
    }

    // F6 (backend side): a null data array is passed through, not rejected or replaced.
    [Fact]
    public void ParseKeepsNullData()
    {
        var payload = Formato2Payload.Parse("""{"title":"T","data":null}""")!;

        Assert.True(payload.ContainsKey("data"));
        Assert.Null(payload["data"]);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ParseReturnsNullForEmptyOutput(string? json)
        => Assert.Null(Formato2Payload.Parse(json));

    [Theory]
    [InlineData("not json")]
    [InlineData("[]")]
    [InlineData("\"[]\"")]
    public void ParseRejectsNonObjectPayload(string json)
        => Assert.ThrowsAny<JsonException>(() => Formato2Payload.Parse(json));

    [Fact]
    public void MissingCatalogTitleKeepsRenderedDialogHeader()
    {
        var payload = Formato2Payload.Parse("""{"data":[],"meta":{"dialogHeader":"Rendered"}}""")!;
        Formato2Payload.ApplyDialogHeader(payload, null);
        Assert.Equal("Rendered", payload["meta"]!["dialogHeader"]!.GetValue<string>());

        var withoutMeta = Formato2Payload.Parse("""{"data":[]}""")!;
        Formato2Payload.ApplyDialogHeader(withoutMeta, "  ");
        Assert.False(withoutMeta.ContainsKey("meta"));

        var unusual = Formato2Payload.Parse("""{"data":[],"meta":["keep"]}""")!;
        Formato2Payload.ApplyDialogHeader(unusual, "Catalog");
        Assert.IsType<JsonArray>(unusual["meta"]);
    }

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response)
        => JsonSerializer.Deserialize<JsonElement>(await response.Content.ReadAsStringAsync());
}

internal sealed class Sui853CftApiFactory : WebApplicationFactory<Program>
{
    internal StubSui853CftRepository Repository { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<ISui853CftRepository>();
            services.AddSingleton<ISui853CftRepository>(Repository);
        });
    }
}

internal sealed class StubSui853CftRepository : ISui853CftRepository
{
    private readonly List<string> codigos = [];

    public IReadOnlyList<string> Codigos
    {
        get { lock (codigos) return codigos.ToArray(); }
    }

    public Task<JsonObject?> GetFormatoAsync(string codigo, CancellationToken cancellationToken)
    {
        lock (codigos) codigos.Add(codigo);
        var payload = Formato2Payload.Parse(
            $$"""{"title":"{{codigo}}","SIN_MOVIMIENTO":{"headersConFiltro":[{"field":"F_CODE","filter":true}]},"data":[{"F_CODE":1.23456789012345678}],"extra":"kept"}""")!;
        Formato2Payload.ApplyDialogHeader(payload, $"{codigo} | Nombre | Descripcion");
        return Task.FromResult<JsonObject?>(payload);
    }
}
