    namespace Veolia.Api.Modules.Regulator.Pgirs;

    /// <summary>
    /// Regulator / Pgirs module: consulta y actualización de variables PGIRS
    /// (resumen, informe de variables, barrido y parametrización) backed by the
    /// Oracle store. The module owns its controller, repository, contracts and DI
    /// registration.
    /// </summary>
    public static class PgirsModule
    {
        public static IServiceCollection AddPgirsModule(this IServiceCollection services)
        {
            services.AddScoped<IPgirsRepository, PgirsRepository>();
            return services;
        }
    }
