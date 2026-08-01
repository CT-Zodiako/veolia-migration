namespace Veolia.Api.Modules.Regulator.Informes;

/// <summary>
/// Regulator / Informes module: commercial reports (resumen de variables,
/// componentes CLUS) backed by the json_json Oracle store. The module owns
/// its controller, repository, contracts and DI registration.
/// </summary>
public static class InformesModule
{
    public static IServiceCollection AddInformesModule(this IServiceCollection services)
    {
        services.AddScoped<IInformesRepository, InformesRepository>();
        return services;
    }
}
