namespace Veolia.Api.Modules.Regulator.Sui;

/// <summary>
/// Regulator / Sui module: dashboard, consulta y resumen de formatos SUI
/// (F19/F23/F24/F35/F36), prevalidación, procesamiento y complemento backed by
/// the Oracle store. The module owns its controller, repository, contracts and
/// DI registration.
/// </summary>
public static class SuiModule
{
    public static IServiceCollection AddSuiModule(this IServiceCollection services)
    {
        services.AddScoped<ISuiRepository, SuiRepository>();
        return services;
    }
}
