namespace Veolia.Api.Modules.Regulator.Suministros;

/// <summary>
/// Regulator / Suministros module: cargue comercial (mensual/semestral), información
/// propia y de competidores, terceros, certificación, poda, reversión y cargue de
/// productividad vía Google Sheets backed by the Oracle store. The module owns its
/// controller, repository, productividad service, contracts and DI registration.
/// </summary>
public static class SuministrosModule
{
    public static IServiceCollection AddSuministrosModule(this IServiceCollection services)
    {
        services.AddScoped<ISuministrosRepository, SuministrosRepository>();
        services.AddScoped<ICargueProductividadService, CargueProductividadService>();
        return services;
    }
}
