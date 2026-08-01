namespace Veolia.Api.Modules.Regulator.Indices;

/// <summary>
/// Regulator / Indices module: regulatory indices (consulta, creación, edición
/// y eliminación por periodo). The module owns its controller, repository,
/// contracts and DI registration.
/// </summary>
public static class IndicesModule
{
    public static IServiceCollection AddIndicesModule(this IServiceCollection services)
    {
        services.AddScoped<IIndicesRepository, IndicesRepository>();
        return services;
    }
}
