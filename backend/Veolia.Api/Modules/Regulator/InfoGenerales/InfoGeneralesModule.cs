    namespace Veolia.Api.Modules.Regulator.InfoGenerales;

    /// <summary>
    /// Regulator / InfoGenerales module: consultas de proyección (energía, acueducto,
    /// costos y tarifas) e historial (certificaciones y productividad) backed by the
    /// Oracle store. The module owns its controller, repository, contracts and DI
    /// registration.
    /// </summary>
    public static class InfoGeneralesModule
    {
        public static IServiceCollection AddInfoGeneralesModule(this IServiceCollection services)
        {
            services.AddScoped<IInfoGeneralesRepository, InfoGeneralesRepository>();
            return services;
        }
    }
