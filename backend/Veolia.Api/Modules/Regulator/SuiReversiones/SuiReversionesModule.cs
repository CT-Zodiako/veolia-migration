namespace Veolia.Api.Modules.Regulator.SuiReversiones;

/// <summary>
/// Regulator / SuiReversiones module: consulta de reversiones SUI por formato
/// (F19/F23/F24/F35/F36) backed by the Oracle store. The module owns its
/// controller, repository, contracts and DI registration.
/// </summary>
public static class SuiReversionesModule
{
    public static IServiceCollection AddSuiReversionesModule(this IServiceCollection services)
    {
        services.AddScoped<ISuiReversionesRepository, SuiReversionesRepository>();
        return services;
    }
}
