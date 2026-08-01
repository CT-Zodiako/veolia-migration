namespace Veolia.Api.Modules.Regulator.Rellenos;

/// <summary>
/// Regulator / Rellenos module: rellenos sanitarios (listar, consultar, crear,
/// editar y eliminar) backed by the AUCO_RELLENOS Oracle store. The module owns
/// its controller, repository, contracts and DI registration.
/// </summary>
public static class RellenosModule
{
    public static IServiceCollection AddRellenosModule(this IServiceCollection services)
    {
        services.AddScoped<IRellenosRepository, RellenosRepository>();
        return services;
    }
}
