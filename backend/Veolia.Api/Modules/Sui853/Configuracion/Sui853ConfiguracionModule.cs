namespace Veolia.Api.Modules.Sui853.Configuracion;

/// <summary>
/// Sui853 / Configuracion module: readmodels de configuración SUI853
/// (VCFGAPSEMPRESA, VCFGAPSDOCUMENTO y TCFGAPS) backed by the Oracle store. The
/// module owns its controller, repository, contract mapper and DI registration.
/// </summary>
public static class Sui853ConfiguracionModule
{
    public static IServiceCollection AddSui853ConfiguracionModule(this IServiceCollection services)
    {
        services.AddScoped<ISui853ReadmodelsRepository, Sui853ReadmodelsRepository>();
        services.AddScoped<Sui853ContractMapper>();
        return services;
    }
}
