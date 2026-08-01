    namespace Veolia.Api.Modules.Regulator.Validaciones;
    
    /// <summary>
    /// Regulator / Validaciones module: validaciones comerciales vía funciones
    /// Oracle PK_VALGRAL (fauco_*) backed by the Oracle store. The module owns
    /// its controller, repository, contracts and DI registration.
    /// </summary>
    public static class ValidacionesModule
    {
        public static IServiceCollection AddValidacionesModule(this IServiceCollection services)
        {
            services.AddScoped<IValidacionesRepository, ValidacionesRepository>();
            return services;
        }
    }
    
    