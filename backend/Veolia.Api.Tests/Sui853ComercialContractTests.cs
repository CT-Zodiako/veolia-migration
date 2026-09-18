using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Veolia.Api.Modules.Sui853.Comercial;

namespace Veolia.Api.Tests;

public sealed class Sui853ComercialContractTests
{
    [Theory]
    [InlineData("", 2025, 1)]
    [InlineData("1 OR 1=1", 2025, 1)]
    [InlineData("-1", 2025, 1)]
    [InlineData("1", 0, 1)]
    [InlineData("1", 2025, 13)]
    [InlineData("1", 2025, 0)]
    public void InvalidRequestsAreRejected(string aps, int year, int month)
    {
        var request = new ComercialRequest(aps, year, month);
        Assert.False(Validator.TryValidateObject(request, new ValidationContext(request), [], true));
    }

    [Fact]
    public void RequestPreservesIdentifierAndLegacyFieldNames()
    {
        const string identifier = "12345678901234567890123456789012345678";
        var request = new ComercialRequest(identifier, 2025, 12);
        Assert.True(Validator.TryValidateObject(request, new ValidationContext(request), [], true));
        var json = JsonSerializer.SerializeToElement(request, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.Equal(identifier, json.GetProperty("apsId").GetString());
        Assert.Equal(2025, json.GetProperty("year").GetInt32());
        Assert.Equal(12, json.GetProperty("month").GetInt32());
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void SummaryPreservesMetadataAndExactRowNumbers(bool doubleEncoded)
    {
        const string raw = """{"title":"Original","meta":{"source":"legacy"},"extra":{"keep":true},"SIN_MOVIMIENTO":{"headers":[{"field":"VALOR","decimal":6}]},"data":[{"APS":9007199254740993,"VALOR":123456789.123456789,"NULO":null}]}""";
        var result = ComercialPayload.ParseSummary(doubleEncoded ? JsonSerializer.Serialize(raw) : raw, "Full title");
        var serialized = JsonSerializer.SerializeToElement(result, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.Equal("legacy", serialized.GetProperty("meta").GetProperty("source").GetString());
        Assert.Equal("Full title", serialized.GetProperty("meta").GetProperty("dialogHeader").GetString());
        Assert.Equal("Original", serialized.GetProperty("title").GetString());
        Assert.True(serialized.GetProperty("extra").GetProperty("keep").GetBoolean());
        Assert.Equal(6, serialized.GetProperty("SIN_MOVIMIENTO").GetProperty("headers")[0].GetProperty("decimal").GetInt32());
        Assert.Equal("9007199254740993", serialized.GetProperty("data")[0].GetProperty("APS").GetString());
        Assert.Equal("123456789.123456789", serialized.GetProperty("data")[0].GetProperty("VALOR").GetString());
        Assert.Equal(JsonValueKind.Null, serialized.GetProperty("data")[0].GetProperty("NULO").ValueKind);
    }

    [Theory]
    [InlineData("[]")]
    [InlineData("null")]
    [InlineData("{\"meta\":[]}")]
    public void UnsupportedSummaryShapesFailExplicitly(string json)
        => Assert.Throws<JsonException>(() => ComercialPayload.ParseSummary(json, null));

    [Fact]
    public async Task BothEndpointsRejectMissingAuthenticationBeforeRepositoryAccess()
    {
        var repository = new UnreachableRepository();
        var controller = new ComercialController(repository, NullLogger<ComercialController>.Instance)
        {
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext() }
        };
        Assert.IsType<UnauthorizedObjectResult>(await controller.Detail(new ComercialRequest("1", 2025, 1), default));
        Assert.IsType<UnauthorizedObjectResult>(await controller.Summary(default));
    }

    private sealed class UnreachableRepository : IComercialRepository
    {
        public Task<IReadOnlyList<Dictionary<string, object?>>> GetDetailAsync(ComercialRequest request, CancellationToken cancellationToken)
            => throw new InvalidOperationException("Repository must not be called.");
        public Task<JsonObject?> GetSummaryAsync(CancellationToken cancellationToken)
            => throw new InvalidOperationException("Repository must not be called.");
    }
}
