namespace Veolia.Api.Modules.Regulator.Costos;

/// <summary>
/// Regulator / Costos module: validación previa, prechecks, cálculo y
/// certificación de tarifas, y consulta de costos por APS y por clúster backed
/// by the Oracle store. The module owns its controller, repository, contracts
/// and DI registration.
/// </summary>
public static class CostosModule
{
    public static IServiceCollection AddCostosModule(this IServiceCollection services)
    {
        services.AddScoped<ICostosRepository, CostosRepository>();
        return services;
    }
}

