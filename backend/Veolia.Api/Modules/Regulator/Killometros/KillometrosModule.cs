namespace Veolia.Api.Modules.Regulator.Killometros;

/// <summary>
/// Regulator / Killometros module: consulta LBL de kilómetros backed by the
/// VAUCO_LBL Oracle store. The module owns its controller, repository,
/// contracts and DI registration.
/// </summary>
public static class KillometrosModule
{
    public static IServiceCollection AddKillometrosModule(this IServiceCollection services)
    {
        services.AddScoped<IKillometrosRepository, KillometrosRepository>();
        return services;
    }
}
