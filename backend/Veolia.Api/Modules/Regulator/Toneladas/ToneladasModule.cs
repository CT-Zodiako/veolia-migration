namespace Veolia.Api.Modules.Regulator.Toneladas;

/// <summary>
/// Regulator / Toneladas module: consultas de toneladas (QRT, QA y detalle)
/// backed by the VAUCO_TONELADAS Oracle store. The module owns its controller,
/// repository, contracts and DI registration.
/// </summary>
public static class ToneladasModule
{
    public static IServiceCollection AddToneladasModule(this IServiceCollection services)
    {
        services.AddScoped<IToneladasRepository, ToneladasRepository>();
        return services;
    }
}
