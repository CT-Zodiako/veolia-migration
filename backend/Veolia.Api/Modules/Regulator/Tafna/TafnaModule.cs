namespace Veolia.Api.Modules.Regulator.Tafna;

/// <summary>
/// Regulator / Tafna module: consulta TAFNA backed by the VAUCO_TONELADAS Oracle
/// store. The module owns its controller, repository, contracts and DI registration.
/// </summary>
public static class TafnaModule
{
    public static IServiceCollection AddTafnaModule(this IServiceCollection services)
    {
        services.AddScoped<ITafnaRepository, TafnaRepository>();
        return services;
    }
}
