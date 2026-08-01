namespace Veolia.Api.Modules.Regulator.Trna;

/// <summary>
/// Regulator / Trna module: consulta TRNA por APS backed by the AUCO_APSEMPRDIVI /
/// AUCO_FACTPRODUCCION Oracle stores. The module owns its controller, repository,
/// contracts and DI registration.
/// </summary>
public static class TrnaModule
{
    public static IServiceCollection AddTrnaModule(this IServiceCollection services)
    {
        services.AddScoped<ITrnaRepository, TrnaRepository>();
        return services;
    }
}
