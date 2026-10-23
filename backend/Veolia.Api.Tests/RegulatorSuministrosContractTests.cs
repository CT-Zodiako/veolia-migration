using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Veolia.Api.Contracts.Requests;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Regulator.Aprovechamiento;
using Veolia.Api.Modules.Regulator.Costos;
using Veolia.Api.Modules.Regulator.Indices;
using Veolia.Api.Modules.Regulator.Suministros;

namespace Veolia.Api.Tests;

public sealed class RegulatorSuministrosContractTests
{
    private const long TokenSisuId = 4242;

    // K1: legacy suministros/controller.js:623-640 runs fauco_certificar(aps, mes, anno, usuario) and COMMITs.
    [Fact]
    public void CertificarSqlCallsFaucoCertificarWithFourArgsAndCommit()
    {
        Assert.Equal("BEGIN :res := PK_CERTIFICACION.fauco_certificar(:1, :2, :3, :4); COMMIT; END;", SuministrosRepository.CertificarSql);
    }

    [Fact]
    public void CertificarBindsApsMesAnnoUsuarioInLegacyOrder()
    {
        var parameters = SuministrosRepository.BuildCertificarParameters(new CertificarRequest(aps: 5, anno: 2026, mes: 3), TokenSisuId);

        Assert.Equal(new[] { "res", "1", "2", "3", "4" }, parameters.ParameterNames);
        Assert.Equal(5, parameters.Get<int>("1"));
        Assert.Equal(3, parameters.Get<int>("2"));
        Assert.Equal(2026, parameters.Get<int>("3"));
        Assert.Equal(TokenSisuId, parameters.Get<long>("4"));
    }

    [Fact]
    public async Task CertificarPassesTokenUserAndReturnsIntegerResult()
    {
        using var factory = new RegulatorSuministrosApiFactory();
        factory.Suministros.CertificarResult = 1;
        using var client = CreateClient(factory, TokenSisuId);

        var response = await client.PostAsJsonAsync("/api/v1/suministros/Certificar", new { aps = 5, anno = 2026, mes = 3, usuario = 9 });
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Number, body.GetProperty("data").ValueKind);
        Assert.Equal(1, body.GetProperty("data").GetInt32());
        var call = Assert.Single(factory.Suministros.CertificarCalls);
        Assert.Equal(new CertificarRequest(5, 2026, 3), call.Request);
        Assert.Equal(TokenSisuId, call.UsuarioId);
    }

    [Fact]
    public async Task CertificarStillRequiresToken()
    {
        using var factory = new RegulatorSuministrosApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/suministros/Certificar", new { aps = 5, anno = 2026, mes = 3 });

        Assert.NotEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(factory.Suministros.CertificarCalls);
    }

    // A1 (308): legacy suministros/controller.js:805 inserts positionally without a column list.
    [Fact]
    public void AprovechamientoInsertMatchesLegacyPositionalValues()
    {
        Assert.Equal("INSERT INTO aprov_activar VALUES(:1, :2, :3, :4, SYSDATE, :5)", AprovechamientoRepository.InsertSql);

        var parameters = AprovechamientoRepository.BuildInsertParameters(aps: 5, anno: 2026, mes: 3, activar: 1, usuarioId: TokenSisuId);

        Assert.Equal(new[] { "1", "2", "3", "4", "5" }, parameters.ParameterNames);
        Assert.Equal(5, parameters.Get<int>("1"));
        Assert.Equal(2026, parameters.Get<int>("2"));
        Assert.Equal(3, parameters.Get<int>("3"));
        Assert.Equal(1, parameters.Get<int>("4"));
        Assert.Equal(TokenSisuId, parameters.Get<long>("5"));
    }

    // A1 (309): legacy suministros/controller.js:1084 inserts positionally without a column list.
    [Fact]
    public void CostoPodaInsertMatchesLegacyPositionalValues()
    {
        Assert.Equal("INSERT INTO AUCO_PODATECHO VALUES (:1, :2, :3, :4, :5, 0, 0, 1, SYSDATE, :6)", SuministrosRepository.NewCostoPodaSql);

        var request = new PodaNuevoRequest([new PodaNuevoItem(1002, "Empresa", 12.5m)], aps: 5, anno: 2026, mes: 3);
        var parameters = SuministrosRepository.BuildNewCostoPodaParameters(request, request.datos[0], TokenSisuId);

        Assert.Equal(new[] { "1", "2", "3", "4", "5", "6" }, parameters.ParameterNames);
        Assert.Equal(5, parameters.Get<int>("1"));
        Assert.Equal(1002, parameters.Get<int>("2"));
        Assert.Equal(2026, parameters.Get<int>("3"));
        Assert.Equal(3, parameters.Get<int>("4"));
        Assert.Equal(12.5m, parameters.Get<decimal>("5"));
        Assert.Equal(TokenSisuId, parameters.Get<long>("6"));
    }

    // T1: legacy costos routes take the user from the token (req.SISU_ID), never from the body.
    [Theory]
    [InlineData("validapreactualiza")]
    [InlineData("calculartarifas")]
    [InlineData("prechecks")]
    [InlineData("certificarTarifas")]
    public async Task CostosUsesTokenUserWhenBodyHasNoUsuario(string route)
    {
        using var factory = new RegulatorSuministrosApiFactory();
        using var client = CreateClient(factory, TokenSisuId);

        var response = await client.PostAsJsonAsync($"/api/v1/costos/{route}", new { aps = 5, mes = 3, anno = 2026 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(new[] { (route, 5, 3, 2026, (int)TokenSisuId) }, factory.Costos.Calls);
    }

    [Theory]
    [InlineData("validapreactualiza")]
    [InlineData("calculartarifas")]
    [InlineData("prechecks")]
    [InlineData("certificarTarifas")]
    public async Task CostosIgnoresUsuarioSentInBody(string route)
    {
        using var factory = new RegulatorSuministrosApiFactory();
        using var client = CreateClient(factory, TokenSisuId);

        var response = await client.PostAsJsonAsync($"/api/v1/costos/{route}", new { aps = 5, mes = 3, anno = 2026, usuario = 9 });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(new[] { (route, 5, 3, 2026, (int)TokenSisuId) }, factory.Costos.Calls);
    }

    [Fact]
    public async Task CostosStillRequiresToken()
    {
        using var factory = new RegulatorSuministrosApiFactory();
        using var client = factory.CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/costos/calculartarifas", new { aps = 5, mes = 3, anno = 2026 });

        Assert.NotEqual(HttpStatusCode.OK, response.StatusCode);
        Assert.Empty(factory.Costos.Calls);
    }

    [Fact]
    public async Task CostosStillValidatesPeriod()
    {
        using var factory = new RegulatorSuministrosApiFactory();
        using var client = CreateClient(factory, TokenSisuId);

        var response = await client.PostAsJsonAsync("/api/v1/costos/calculartarifas", new { aps = 5, mes = 13, anno = 2026 });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty(factory.Costos.Calls);
    }

    // C1: legacy Cra.vue sends blank indices as null and indicesCRA/controller.js:10 stores them as-is.
    [Fact]
    public async Task IndicesCrearKeepsBlankValuesAsNull()
    {
        using var factory = new RegulatorSuministrosApiFactory();
        using var client = CreateClient(factory, TokenSisuId);

        var response = await client.PostAsJsonAsync("/api/v1/indices/crear", new
        {
            anno = 2026,
            mes = 3,
            valores = new object[]
            {
                new { id = 1, val = (decimal?)null },
                new { id = 2, val = (decimal?)1423500m },
                new { id = 3, val = (decimal?)null },
                new { id = 4, val = (decimal?)null }
            }
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var crear = Assert.Single(factory.Indices.Creates);
        Assert.Equal(TokenSisuId, crear.UsuarioId);
        Assert.Equal(2026, crear.Dto.Anno);
        Assert.Equal(3, crear.Dto.Mes);
        Assert.Equal(new[] { 1L, 2L, 3L, 4L }, crear.Dto.Valores.Select(v => v.Id));
        Assert.Equal(new decimal?[] { null, 1423500m, null, null }, crear.Dto.Valores.Select(v => (decimal?)v.Val));
    }

    [Fact]
    public async Task IndicesEditarStillRejectsNullValue()
    {
        using var factory = new RegulatorSuministrosApiFactory();
        using var client = CreateClient(factory, TokenSisuId);

        var response = await client.PutAsJsonAsync("/api/v1/indices/editar", new
        {
            anno = 2026,
            mes = 3,
            valores = new object[] { new { id = 1, val = (decimal?)null } }
        });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(0, factory.Indices.EditCalls);
    }

    private static HttpClient CreateClient(WebApplicationFactory<Program> factory, long sisuId)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Add("x-access-token", TestJwt.Build(sisuId));
        return client;
    }
}

file sealed class RegulatorSuministrosApiFactory : WebApplicationFactory<Program>
{
    internal StubCostosRepository Costos { get; } = new();
    internal StubIndicesRepository Indices { get; } = new();
    internal StubSuministrosRepository Suministros { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("Auth:JwtSecret", TestJwt.Secret);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IOracleConnectionFactory>();
            services.AddSingleton<IOracleConnectionFactory>(new SqliteOracleConnectionFactory());
            services.RemoveAll<ICostosRepository>();
            services.AddSingleton<ICostosRepository>(Costos);
            services.RemoveAll<IIndicesRepository>();
            services.AddSingleton<IIndicesRepository>(Indices);
            services.RemoveAll<ISuministrosRepository>();
            services.AddSingleton<ISuministrosRepository>(Suministros);
        });
    }
}

file sealed class StubCostosRepository : ICostosRepository
{
    public List<(string Route, int Aps, int Mes, int Anno, int Usuario)> Calls { get; } = [];

    public Task<ValidapreactualizaResponse> ValidapreactualizaAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
    {
        Calls.Add(("validapreactualiza", aps, mes, anno, usuario));
        return Task.FromResult(new ValidapreactualizaResponse(true, []));
    }

    public Task<RunPrechecksResponse> RunPrechecksAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
    {
        Calls.Add(("prechecks", aps, mes, anno, usuario));
        return Task.FromResult(new RunPrechecksResponse(true, []));
    }

    public Task<CalculartarifasResponse> CalculartarifasAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
    {
        Calls.Add(("calculartarifas", aps, mes, anno, usuario));
        return Task.FromResult(new CalculartarifasResponse(true, "1"));
    }

    public Task<CertificarTarifasResponse> CertificarTarifasAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
    {
        Calls.Add(("certificarTarifas", aps, mes, anno, usuario));
        return Task.FromResult(new CertificarTarifasResponse(true, null));
    }

    public Task<IReadOnlyList<CostoItemResponse>> ConsultarCostosAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        => throw new NotImplementedException();

    public Task<IReadOnlyList<CostoClusItemResponse>> ConsultarCostosClusAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        => throw new NotImplementedException();

    public Task<IReadOnlyList<ComportaClusItemResponse>> ConsultarComportaClusAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        => throw new NotImplementedException();
}

file sealed class StubIndicesRepository : IIndicesRepository
{
    public List<(IndicesCrearRequestDto Dto, long UsuarioId)> Creates { get; } = [];
    public int EditCalls { get; private set; }

    public Task<long> CrearAsync(IndicesCrearRequestDto dto, long usuarioId, CancellationToken cancellationToken = default)
    {
        Creates.Add((dto, usuarioId));
        return Task.FromResult(1L);
    }

    public Task<bool> EditarAsync(IndicesEditarRequestDto dto, CancellationToken cancellationToken = default)
    {
        EditCalls++;
        return Task.FromResult(true);
    }

    public Task<IReadOnlyList<IndicesResponseDto>> GetByPeriodAsync(int anno, int mes, CancellationToken cancellationToken = default)
        => Task.FromResult<IReadOnlyList<IndicesResponseDto>>([]);

    public Task<IReadOnlyList<IndicesResponseDto>> GetAllAsync(CancellationToken cancellationToken = default)
        => throw new NotImplementedException();

    public Task<IndicesResponseDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default)
        => throw new NotImplementedException();

    public Task<bool> EliminarAsync(long indiceTipoId, int anno, int mes, CancellationToken cancellationToken = default)
        => throw new NotImplementedException();

    public Task<IReadOnlyList<IndiceCatalogoDto>> GetCatalogoAsync(CancellationToken cancellationToken = default)
        => throw new NotImplementedException();
}

file sealed class StubSuministrosRepository : ISuministrosRepository
{
    public int? CertificarResult { get; set; }
    public List<(CertificarRequest Request, long UsuarioId)> CertificarCalls { get; } = [];

    public Task<int?> CertificarAsync(CertificarRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        CertificarCalls.Add((request, usuarioId));
        return Task.FromResult(CertificarResult);
    }

    public Task<ReversionResponse> SetReversionAsync(SetReversionRequest request, int sisuId, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<IReadOnlyList<ReversionHistoryItem>> GetReversionAsync(CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<int> SetCargueInfPropiaAsync(CarguePropiaRequest request, long usuarioId, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<int> SetCargueInfPropiaSemAsync(CarguePropiaSemRequest request, long usuarioId, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<int> SetCargueInfCompetidorAsync(CargueCompetidorRequest request, long usuarioId, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<int> SetCargueInfCompetidorSemestralAsync(CargueCompetidorSemRequest request, long usuarioId, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<int> SetTercerosAsync(TercerosRequest request, long usuarioId, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<int> SetCargueComercialAsync(CargueComercialRequest request, long usuarioId, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<int> SetCargueComercialSemAsync(CargueComercialSemRequest request, long usuarioId, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task ReemplazarProductividadAsync(int anno, int mes, IReadOnlyList<ProductividadCargueRow> propios, IReadOnlyList<ProductividadCargueRow> terceros, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<int> GuardarQrtRuralAsync(QRTRuralRequest request, long usuarioId, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<IReadOnlyList<dynamic>> GetCanCertificateAsync(PrevalidarRequest request, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<int> GetCanCertificateSemestralAsync(PrevalidarSemestralRequest request, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<int?> CertificarSemestralAsync(CertificarSemestralRequest request, long usuarioId, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<string?> CertificarMensualAsync(CertificarRequest request, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<PlCertificarSemestralResponse> PlCertificarSemestralAsync(CertificarSemestralRequest request, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<string?> CenrtificarEditarAsync(CertificarRequest request, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<IReadOnlyList<dynamic>> GetPodaAsync(PodaConsultaRequest request, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task<IReadOnlyList<dynamic>> ConsultaCostoPodaAsync(PodaCatalogoRequest request, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task NewCostoPodaAsync(PodaNuevoRequest request, long usuarioId, CancellationToken cancellationToken) => throw new NotImplementedException();
    public Task RegistrarPodaAsync(PodaEditarRequest request, long usuarioId, CancellationToken cancellationToken) => throw new NotImplementedException();
}
