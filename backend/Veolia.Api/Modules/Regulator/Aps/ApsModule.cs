namespace Veolia.Api.Modules.Regulator.Aps;

/// <summary>
/// Regulator / Aps module: áreas de prestación de servicio (consulta, creación,
/// edición y eliminación) backed by the AUCO_APSASEO Oracle store. The module
/// owns its controller, repository, contract mapper and DI registration.
/// </summary>
public static class ApsModule
{
    public static IServiceCollection AddApsModule(this IServiceCollection services)
    {
        services.AddScoped<IApsRepository, ApsRepository>();
        services.AddScoped<ApsContractMapper>();
        return services;
    }
}
