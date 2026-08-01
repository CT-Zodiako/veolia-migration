namespace Veolia.Api.Modules.Regulator.General;

public static class GeneralModule
{
    public static IServiceCollection AddGeneralModule(this IServiceCollection services)
    {
        services.AddScoped<IGeneralRepository, GeneralRepository>();
        return services;
    }
}
