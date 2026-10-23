using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Modules.Auth;
using Veolia.Api.Modules.Regulator.Aps;
using Veolia.Api.Modules.Regulator.Costos;
using Veolia.Api.Modules.Regulator.Empresas;
using Veolia.Api.Modules.Regulator.Facturacion;
using Veolia.Api.Modules.Regulator.Proyecciones;
using Veolia.Api.Modules.Regulator.Rellenos;
using Veolia.Api.Modules.Regulator.SubCont;
using Veolia.Api.Modules.Regulator.Tarifas;
using Veolia.Api.Modules.Regulator.Validaciones;
using Veolia.Api.Modules.Regulator.Informes;
using Veolia.Api.Modules.Regulator.Indices;
using Veolia.Api.Modules.Regulator.Productividad;
using Veolia.Api.Modules.Regulator.Aprovechamiento;
using Veolia.Api.Modules.Regulator.Toneladas;
using Veolia.Api.Modules.Regulator.Killometros;
using Veolia.Api.Modules.Regulator.Trna;
using Veolia.Api.Modules.Regulator.Tafna;
using Veolia.Api.Modules.Regulator.UsuariosGrafico;
using Veolia.Api.Modules.Regulator.InfoGenerales;
using Veolia.Api.Modules.Regulator.InfoGerencial;
using Veolia.Api.Modules.Regulator.Pgirs;
using Veolia.Api.Modules.Regulator.Reversiones;
using Veolia.Api.Modules.Regulator.Sui;
using Veolia.Api.Modules.Regulator.SuiReversiones;
using Veolia.Api.Modules.Regulator.Suministros;
using Veolia.Api.Modules.Regulator.General;
using Veolia.Api.Modules.Regulator.Health;
using Veolia.Api.Modules.Reliquidaciones;
using Veolia.Api.Modules.Sui853.Cdft;
using Veolia.Api.Modules.Sui853.Cft;
using Veolia.Api.Modules.Sui853.Configuracion;
using Veolia.Api.Infrastructure.GoogleDrive;

var builder = WebApplication.CreateBuilder(args);

// IMPORTANTE: no tocar PropertyNamingPolicy acá. La gran mayoría de los
// endpoints devuelven filas dinámicas de Dapper (columna Oracle preservada
// tal cual, no afectadas por esta policy) o DTOs PascalCase pensados para el
// camelCase por defecto que el frontend ya consume. Los pocos DTOs que
// exponen el nombre de columna Oracle en mayúsculas (ej. RellenoResponse)
// fijan su propio contrato con [JsonPropertyName] en vez de cambiar esto acá.
builder.Services.AddControllers();

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        policy
            .WithOrigins("http://localhost:4200", "http://localhost:4201","http://192.168.13.50")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddScoped<IOracleConnectionFactory, OracleConnectionFactory>();
builder.Services.AddHealthModule();
builder.Services.AddAuthModule();
builder.Services.AddApsModule();
builder.Services.AddEmpresasModule();
builder.Services.AddGeneralModule();
builder.Services.AddTarifasModule();
builder.Services.AddReversionesModule();
builder.Services.AddSuministrosModule();
builder.Services.AddSuiReversionesModule();
builder.Services.AddSuiModule();
builder.Services.AddInformesModule();
builder.Services.AddSui853ConfiguracionModule();
builder.Services.AddValidacionesModule();
builder.Services.AddCostosModule();
builder.Services.AddToneladasModule();
builder.Services.AddFacturacionModule();
builder.Services.AddRellenosModule();
builder.Services.AddKillometrosModule();
builder.Services.AddTrnaModule();
builder.Services.AddTafnaModule();
builder.Services.AddUsuariosGraficoModule();
builder.Services.AddSui853CftModule();
builder.Services.AddScoped<Veolia.Api.Modules.Sui853.Comercial.IComercialRepository, Veolia.Api.Modules.Sui853.Comercial.ComercialRepository>();
builder.Services.AddCdftModule();
builder.Services.AddScoped<Veolia.Api.Modules.Sui853.General.IFacRepository, Veolia.Api.Modules.Sui853.General.FacRepository>();
builder.Services.AddSubContModule();
builder.Services.AddProyeccionesModule();
builder.Services.AddReliquidacionesModule();
builder.Services.AddInfoGeneralesModule();
builder.Services.AddInfoGerencialModule();
builder.Services.AddPgirsModule();
builder.Services.AddIndicesModule();
builder.Services.AddProductividadModule();
builder.Services.AddAprovechamientoModule();

builder.Services.Configure<GoogleDriveOptions>(builder.Configuration.GetSection(GoogleDriveOptions.SectionName));
builder.Services.AddSingleton<IGoogleSheetsService, GoogleSheetsService>();

var app = builder.Build();

// Fail fast: without a strong Auth:JwtSecret no token can be issued or verified.
AuthJwtSecret.EnsureConfigured(app.Configuration);

app.UseCors("FrontendPolicy");

// Every /api/v1 route requires a verified, non-expired, non-revoked token (legacy
// authJwt.verificarToken). Deny by default: a new controller is protected without touching this
// file. Only the pre-login routes below stay anonymous. Intentional TO-BE hardening: the legacy
// backend also left registro, getSistemasPorUsuario, asignarSistema, getMenuByUser, allSistemas
// and aps/usuarioPorAPS anonymous (S10), plus Reliquidaciones and SUI853; all of them require a
// token now. User-management endpoints additionally require the user-admin permission
// (IUserAdminAuthorization).
var anonymousApiRoutes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
{
    "/api/v1/auth/login",
    "/api/v1/auth/validate-credentials"
};

app.UseWhen(
    context => context.Request.Path.StartsWithSegments("/api/v1", StringComparison.OrdinalIgnoreCase)
        && !anonymousApiRoutes.Contains(context.Request.Path.Value ?? string.Empty),
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.MapControllers();

app.Run();
