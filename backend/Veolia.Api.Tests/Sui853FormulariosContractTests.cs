using System.ComponentModel.DataAnnotations;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Veolia.Api.Modules.Sui853.Configuracion;

namespace Veolia.Api.Tests;

public sealed class Sui853FormulariosContractTests
{
    private static FormularioRow ValidRow() => new()
    {
        FORMATO = "F1", SECCION = "S1", FIELD = "FIELD1", HEADER_TXT = "Title",
        BACKGROUND_COLOR = "B", FILTER_FLAG = "N", FORMATO_DATO = "porcentaje",
        DECIMALES = 6, ALINEACION = "der", MOSTRAR_HEADER = "S", INCLUIR_DATA = "N",
        ORDEN_HEADER = 0, ORDEN_DATA = 1
    };
    private static bool IsValid(FormularioRow row)
        => Validator.TryValidateObject(row, new ValidationContext(row), new List<ValidationResult>(), true);

    [Fact]
    public void WebSerializationPreservesAllFourteenUppercaseFieldsAndPercentageDecimals()
    {
        var json = JsonSerializer.SerializeToElement(ValidRow(), new JsonSerializerOptions(JsonSerializerDefaults.Web));
        string[] expectedFields = ["FORMATO", "SECCION", "FIELD", "HEADER_TXT", "BACKGROUND_COLOR",
            "FILTER_FLAG", "FORMATO_DATO", "DECIMALES", "ALINEACION", "TOOLTIP", "MOSTRAR_HEADER",
            "INCLUIR_DATA", "ORDEN_HEADER", "ORDEN_DATA"];
        Assert.Equal(expectedFields.OrderBy(x => x), json.EnumerateObject().Select(p => p.Name).OrderBy(x => x));
        Assert.Equal(6, json.GetProperty("DECIMALES").GetInt32());
        Assert.True(IsValid(ValidRow()));
    }

    [Theory]
    [InlineData("R", "S", "izq")]
    [InlineData("G", "N", "centro")]
    [InlineData("B", "S", "der")]
    public void AcceptsExactLegacyCatalogs(string color, string flag, string alignment)
    {
        var row = ValidRow();
        row.BACKGROUND_COLOR = color;
        row.FILTER_FLAG = row.MOSTRAR_HEADER = row.INCLUIR_DATA = flag;
        row.ALINEACION = alignment;
        Assert.True(IsValid(row));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(3)]
    [InlineData(6)]
    public async Task PercentageDecimalsReachRepositoryAndResponseUnchanged(int decimals)
    {
        var options = new JsonSerializerOptions(JsonSerializerDefaults.Web);
        var row = ValidRow(); row.DECIMALES = decimals;
        var request = JsonSerializer.Deserialize<FormularioRow>(JsonSerializer.Serialize(row, options), options)!;
        Assert.True(IsValid(request));
        var repo = new StubRepository { Saved = request };
        var result = Assert.IsType<OkObjectResult>(await Controller(repo, 3).Update(request, default));
        Assert.Equal(decimals, repo.Submitted!.DECIMALES);
        Assert.Equal(decimals, JsonSerializer.SerializeToElement(result.Value, options)
            .GetProperty("data").GetProperty("DECIMALES").GetInt32());
    }

    [Theory]
    [InlineData("numero", 0, true)]
    [InlineData("porcentaje", 6, true)]
    [InlineData("porcentaje", 7, false)]
    [InlineData("numero", -1, false)]
    [InlineData("porcentaje", null, false)]
    [InlineData("texto", null, true)]
    [InlineData("fecha", null, true)]
    [InlineData("texto", 2, false)]
    [InlineData("moneda", null, false)]
    public void ValidatesDecimalApplicability(string format, int? decimals, bool expected)
    {
        var row = ValidRow(); row.FORMATO_DATO = format; row.DECIMALES = decimals;
        Assert.Equal(expected, IsValid(row));
    }

    [Theory]
    [InlineData("FORMATO", " ")]
    [InlineData("SECCION", "")]
    [InlineData("FIELD", null)]
    [InlineData("HEADER_TXT", " ")]
    [InlineData("BACKGROUND_COLOR", "T")]
    [InlineData("FILTER_FLAG", "Y")]
    [InlineData("MOSTRAR_HEADER", "1")]
    [InlineData("INCLUIR_DATA", "s")]
    [InlineData("ALINEACION", "right")]
    public void RejectsInvalidIdentityHeaderAndCatalogs(string field, string? value)
    {
        var row = ValidRow(); typeof(FormularioRow).GetProperty(field)!.SetValue(row, value);
        Assert.False(IsValid(row));
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(null)]
    public void RequiresNonnegativeOrders(int? order)
    {
        var row = ValidRow(); row.ORDEN_HEADER = order;
        Assert.False(IsValid(row));
        row = ValidRow(); row.ORDEN_DATA = order;
        Assert.False(IsValid(row));
    }

    [Fact]
    public async Task RequiresContextAndSystemThreeBeforeRepositoryAccess()
    {
        var repo = new StubRepository(); var controller = Controller(repo, null);
        Assert.IsType<UnauthorizedObjectResult>(await controller.List(default));
        Assert.IsType<UnauthorizedObjectResult>(await controller.Update(ValidRow(), default));
        Assert.False(repo.Called);
        controller = Controller(repo, 2);
        Assert.Equal(403, Assert.IsType<ObjectResult>(await controller.List(default)).StatusCode);
        Assert.Equal(403, Assert.IsType<ObjectResult>(await controller.Update(ValidRow(), default)).StatusCode);
        Assert.False(repo.Called);
    }

    [Fact]
    public async Task ReturnsReloadedRowAndHandlesMissingRowAndSanitizedErrors()
    {
        var repo = new StubRepository { Saved = ValidRow() };
        repo.Saved.HEADER_TXT = "Database result";
        var controller = Controller(repo, 3);
        var result = Assert.IsType<OkObjectResult>(await controller.Update(ValidRow(), default));
        var json = JsonSerializer.SerializeToElement(result.Value, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.Equal("Database result", json.GetProperty("data").GetProperty("HEADER_TXT").GetString());
        repo.Saved = null;
        Assert.IsType<NotFoundObjectResult>(await controller.Update(ValidRow(), default));
        repo.Fail = true;
        var error = Assert.IsType<ObjectResult>(await controller.List(default));
        Assert.Equal(500, error.StatusCode);
        Assert.DoesNotContain("database-detail", JsonSerializer.Serialize(error.Value));
    }

    private static FormulariosController Controller(StubRepository repository, int? system)
    {
        var context = new DefaultHttpContext();
        // Controller unit test only: production middleware verifies the JWT signature.
        if (system.HasValue)
            context.Request.Headers["x-access-token"] = "test." + Convert.ToBase64String(Encoding.UTF8.GetBytes(
                JsonSerializer.Serialize(new { SISU_ID = 1, idSistema = system.Value }))) + ".test";
        return new FormulariosController(repository, NullLogger<FormulariosController>.Instance)
        { ControllerContext = new ControllerContext { HttpContext = context } };
    }

    private sealed class StubRepository : IFormulariosRepository
    {
        public bool Called { get; private set; }
        public bool Fail { get; set; }
        public FormularioRow? Saved { get; set; }
        public FormularioRow? Submitted { get; private set; }
        public Task<IReadOnlyList<FormularioRow>> ListAsync(CancellationToken cancellationToken)
        {
            Called = true;
            if (Fail) throw new InvalidOperationException("database-detail");
            return Task.FromResult<IReadOnlyList<FormularioRow>>([]);
        }
        public Task<FormularioRow?> UpdateAsync(FormularioRow row, CancellationToken cancellationToken)
        { Called = true; Submitted = row; return Task.FromResult(Saved); }
    }
}
