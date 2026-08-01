    namespace Veolia.Api.Modules.Regulator.Tarifas;
    
    /// <summary>
    /// Regulator / Tarifas module: consultas de tarifas (por APS, general, por
    /// componente y resumen) backed by the vauco_tarifa4 Oracle store. The module
    /// owns its controller, repository and DI registration.
    /// </summary>
    public static class TarifasModule
    {
        public static IServiceCollection AddTarifasModule(this IServiceCollection services)
        {
            services.AddScoped<ITarifasRepository, TarifasRepository>();
            return services;
        }
    }
    
    