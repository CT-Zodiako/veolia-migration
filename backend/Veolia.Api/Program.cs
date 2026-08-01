using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Infrastructure.Auth;
using Veolia.Api.Infrastructure.Data.Interfaces;
using Veolia.Api.Modules.Regulator.Aps;
using Veolia.Api.Modules.Regulator.Empresas;
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
using Veolia.Api.Modules.Reliquidaciones;
using Veolia.Api.Modules.Sui853.Cft;
using Veolia.Api.Modules.Sui853.Configuracion;
using Veolia.Api.Infrastructure.GoogleDrive;
using Veolia.Api.Services;

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
            .WithOrigins("http://localhost:4200", "http://localhost:4201")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services.AddScoped<IOracleConnectionFactory, OracleConnectionFactory>();
builder.Services.AddScoped<IHealthRepository, HealthRepository>();
builder.Services.AddScoped<IAuthRepository, AuthRepository>();
builder.Services.AddScoped<AuthContractMapper>();
builder.Services.AddApsModule();
builder.Services.AddEmpresasModule();
builder.Services.AddScoped<IGeneralRepository, GeneralRepository>();
builder.Services.AddTarifasModule();
builder.Services.AddReversionesModule();
builder.Services.AddSuministrosModule();
builder.Services.AddSuiReversionesModule();
builder.Services.AddSuiModule();
builder.Services.AddInformesModule();
builder.Services.AddSui853ConfiguracionModule();
builder.Services.AddValidacionesModule();
builder.Services.AddScoped<ICostosRepository, CostosRepository>();
builder.Services.AddToneladasModule();
builder.Services.AddScoped<IFacturacionRepository, FacturacionRepository>();
builder.Services.AddRellenosModule();
builder.Services.AddKillometrosModule();
builder.Services.AddTrnaModule();
builder.Services.AddTafnaModule();
builder.Services.AddUsuariosGraficoModule();
builder.Services.AddSui853CftModule();
builder.Services.AddSubContModule();
builder.Services.AddScoped<IProyeccionRepository, ProyeccionRepository>();
builder.Services.AddScoped<ILineaTiempoRepository, LineaTiempoRepository>();
builder.Services.AddScoped<ICrecimientoRepository, CrecimientoRepository>();
builder.Services.AddScoped<ISubcontProyRepository, SubcontProyRepository>();
builder.Services.AddScoped<IEjecucionProyeccionRepository, EjecucionProyeccionRepository>();
builder.Services.AddReliquidacionesModule();
builder.Services.AddInfoGeneralesModule();
builder.Services.AddInfoGerencialModule();
builder.Services.AddPgirsModule();
builder.Services.AddIndicesModule();
builder.Services.AddProductividadModule();
builder.Services.AddAprovechamientoModule();

builder.Services.Configure<GoogleDriveOptions>(builder.Configuration.GetSection(GoogleDriveOptions.SectionName));
builder.Services.AddSingleton<IGoogleSheetsService, GoogleSheetsService>();
builder.Services.AddScoped<ICrecimientoDriveService, CrecimientoDriveService>();

var app = builder.Build();

app.UseCors("FrontendPolicy");

var authAnonymousRoutes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
{
    "/api/v1/auth/login",
        "/api/v1/auth/registro",
    "/api/v1/auth/getSistemasByCorreo",
    "/api/v1/auth/getSistemasPorUsuario",
    "/api/v1/auth/asignarSistema",
    "/api/v1/auth/getMenuByUser",
    "/api/v1/auth/allSistemas"
};

var apsAnonymousRoutes = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
{
    "/api/v1/aps/usuarioPorAPS"
};

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/auth", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var requestPath = context.Request.Path.Value ?? string.Empty;
        return !authAnonymousRoutes.Contains(requestPath);
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/indices", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/rellenos", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/aps", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var requestPath = context.Request.Path.Value ?? string.Empty;
        return !apsAnonymousRoutes.Contains(requestPath);
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/empresas", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/tarifas", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/reversiones", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/suministros", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/sui", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/informes", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/validaciones", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/facturacion", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/costos", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/toneladas", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/kilometros", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/proyecciones", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/subcon", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/reliq", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/productividad", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/aprovechamiento", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/infogenerales", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/infogerencial", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.UseWhen(
    context =>
    {
        if (!context.Request.Path.StartsWithSegments("/api/v1/pgirs", StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        return true;
    },
    branch => { branch.UseMiddleware<AuthJwtParityMiddleware>(); });

app.MapControllers();

app.Run();
