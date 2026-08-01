namespace Veolia.Api.Modules.Regulator.Health;

public static class HealthModule
{
    public static IServiceCollection AddHealthModule(this IServiceCollection services)
    {
        services.AddScoped<IHealthRepository, HealthRepository>();
        return services;
    }
}
