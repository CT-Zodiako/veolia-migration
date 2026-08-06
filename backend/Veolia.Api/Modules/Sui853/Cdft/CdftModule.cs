namespace Veolia.Api.Modules.Sui853.Cdft;

/// <summary>
/// Sui853 / Cdft module: endpoint /cdft, consulta directa contra
/// SUI.TCDFT_QRT_ANUAL (no pasa por SUI.f_render_formato2). El módulo owns
/// su controller, repository, contracts y registro de DI.
/// </summary>
public static class CdftModule
{
    public static IServiceCollection AddCdftModule(this IServiceCollection services)
    {
        services.AddScoped<ICdftRepository, CdftRepository>();
        return services;
    }
}
