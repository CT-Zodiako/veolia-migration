using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Veolia.Api.Modules.Sui853.General;

namespace Veolia.Api.Tests;

public sealed class Sui853FacContractTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void PreservesDynamicPayloadAndMetadata(bool doubleEncoded)
    {
        const string json = """{"title":"Original","meta":{"dialogHeader":"Rendered","other":true},"SIN_MOVIMIENTO":{"headers":[{"field":"EXACT_KEY","filter":true}]},"data":[{"EXACT_KEY":null,"VALUE":123456789.123456789}],"extra":"kept"}""";
        var payload = FacPayload.Parse(doubleEncoded ? JsonSerializer.Serialize(json) : json);
        FacPayload.ApplyTitle(payload, "F853GR01 | Name | Description");
        var result = JsonSerializer.SerializeToElement(payload, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.Equal("Original", result.GetProperty("title").GetString());
        Assert.True(result.GetProperty("meta").GetProperty("other").GetBoolean());
        Assert.Equal("F853GR01 | Name | Description", result.GetProperty("meta").GetProperty("dialogHeader").GetString());
        Assert.Equal("kept", result.GetProperty("extra").GetString());
        Assert.Equal(JsonValueKind.Null, result.GetProperty("data")[0].GetProperty("EXACT_KEY").ValueKind);
        Assert.Equal(123456789.123456789m, result.GetProperty("data")[0].GetProperty("VALUE").GetDecimal());
        Assert.True(result.GetProperty("SIN_MOVIMIENTO").GetProperty("headers")[0].GetProperty("filter").GetBoolean());
    }

    [Fact]
    public void MissingCatalogTitleDoesNotEraseRenderedTitle()
    {
        var payload = FacPayload.Parse("""{"data":[],"meta":{"dialogHeader":"Rendered"}}""");
        FacPayload.ApplyTitle(payload, null);
        Assert.Equal("Rendered", payload["meta"]!["dialogHeader"]!.GetValue<string>());
        var unusual = FacPayload.Parse("""{"data":[],"meta":["keep"]}""");
        FacPayload.ApplyTitle(unusual, "Catalog");
        Assert.IsType<JsonArray>(unusual["meta"]);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("not json")]
    [InlineData("[]")]
    [InlineData("{\"error\":true}")]
    public void InvalidPayloadFailsExplicitly(string? json)
        => Assert.Throws<JsonException>(() => FacPayload.Parse(json));

    [Fact]
    public async Task RequiresAuthenticationBeforeRepositoryAccess()
    {
        var controller = new FacController(new UnreachableRepository(), NullLogger<FacController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
        Assert.IsType<UnauthorizedObjectResult>(await controller.Get(default));
        Assert.Equal("F853GR01", FacRepository.FormatCode);
        Assert.Single(typeof(FacController).GetMethod(nameof(FacController.Get))!.GetParameters());
    }

    private sealed class UnreachableRepository : IFacRepository
    {
        public Task<JsonObject> GetAsync(CancellationToken cancellationToken)
            => throw new InvalidOperationException("Repository must not be called.");
    }
}
