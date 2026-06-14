using Veolia.Api.Infrastructure.Sui853;

namespace Veolia.Api.Tests;

public sealed class Sui853ContractMapperTests
{
    private readonly Sui853ContractMapper mapper = new();

    [Fact]
    public void MapOk_ReturnsStatus200AndOriginalData()
    {
        var data = new[]
        {
            new Dictionary<string, object>
            {
                ["TCFG_APS_ID"] = 10,
                ["NOMBRE_APS"] = "APS Norte"
            }
        };

        var result = mapper.MapOk(data);
        var dictionary = ToDictionary(result);

        Assert.Equal(200, dictionary["status"]);
        Assert.Same(data, dictionary["data"]);
    }

    [Fact]
    public void MapError_ReturnsStatus500AndLegacyErrorText()
    {
        var result = mapper.MapError();
        var dictionary = ToDictionary(result);

        Assert.Equal(500, dictionary["status"]);
        Assert.Equal("Error", dictionary["data"]);
    }

    private static IDictionary<string, object?> ToDictionary(object instance)
    {
        return instance
            .GetType()
            .GetProperties()
            .ToDictionary(prop => prop.Name, prop => prop.GetValue(instance));
    }
}
