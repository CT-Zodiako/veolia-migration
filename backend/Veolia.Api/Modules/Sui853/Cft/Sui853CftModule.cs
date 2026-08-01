namespace Veolia.Api.Modules.Sui853.Cft;

/// <summary>
/// Sui853 / Cft module: los 12 endpoints de formato2 (CFT, CSS Aprovechamiento,
/// CRLUS, CBLS, CBLUS y CBICS) backed by the Oracle store. The module owns its
/// controller, repository, contracts and DI registration.
/// </summary>
public static class Sui853CftModule
{
    public static IServiceCollection AddSui853CftModule(this IServiceCollection services)
    {
        services.AddScoped<ISui853CftRepository, Sui853CftRepository>();
        return services;
    }
}
