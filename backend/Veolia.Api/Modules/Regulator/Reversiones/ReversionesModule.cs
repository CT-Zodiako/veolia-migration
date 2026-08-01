namespace Veolia.Api.Modules.Regulator.Reversiones;

/// <summary>
/// Regulator / Reversiones module: creación y detalle de autorizaciones de
/// reversión backed by the Oracle store. The module owns its controller,
/// repository and DI registration.
/// </summary>
public static class ReversionesModule
{
    public static IServiceCollection AddReversionesModule(this IServiceCollection services)
    {
        services.AddScoped<IReversionesRepository, ReversionesRepository>();
        return services;
    }
}
