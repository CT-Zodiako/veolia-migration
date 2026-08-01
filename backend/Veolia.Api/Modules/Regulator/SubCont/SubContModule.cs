    namespace Veolia.Api.Modules.Regulator.SubCont;
    
    /// <summary>
    /// Regulator / SubCont module: subestación de consumo (consultar, crear,
    /// editar, listar APS y eliminar) backed by the Oracle store. The module owns
    /// its controller, repository, contracts and DI registration.
    /// </summary>
    public static class SubContModule
    {
        public static IServiceCollection AddSubContModule(this IServiceCollection services)
        {
            services.AddScoped<ISubContRepository, SubContRepository>();
            return services;
        }
    }
    
    