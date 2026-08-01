namespace Veolia.Api.Modules.Regulator.Aprovechamiento;

/// <summary>
/// Regulator / Aprovechamiento module: aprovechamiento por periodo (consulta y
/// activación/desactivación). The module owns its controller, repository,
/// contracts and DI registration.
/// </summary>
public static class AprovechamientoModule
{
    public static IServiceCollection AddAprovechamientoModule(this IServiceCollection services)
    {
        services.AddScoped<IAprovechamientoRepository, AprovechamientoRepository>();
        return services;
    }
}
