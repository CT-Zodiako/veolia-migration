namespace Veolia.Api.Modules.Regulator.Productividad;

/// <summary>
/// Regulator / Productividad module: productividad por periodo (consulta,
/// creación y edición). The module owns its controller, repository, contracts
/// and DI registration.
/// </summary>
public static class ProductividadModule
{
    public static IServiceCollection AddProductividadModule(this IServiceCollection services)
    {
        services.AddScoped<IProductividadRepository, ProductividadRepository>();
        return services;
    }
}
