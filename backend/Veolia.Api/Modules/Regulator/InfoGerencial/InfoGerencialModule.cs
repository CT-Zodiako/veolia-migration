    namespace Veolia.Api.Modules.Regulator.InfoGerencial;

    /// <summary>
    /// Regulator / InfoGerencial module: información gerencial (detalle de costos,
    /// sub-aportes, APS/empresa/divipola, rellenos, dashboard y descuentos de costo)
    /// backed by the Oracle store. The module owns its controller, repository,
    /// contracts and DI registration.
    /// </summary>
    public static class InfoGerencialModule
    {
        public static IServiceCollection AddInfoGerencialModule(this IServiceCollection services)
        {
            services.AddScoped<IInfoGerencialRepository, InfoGerencialRepository>();
            return services;
        }
    }
