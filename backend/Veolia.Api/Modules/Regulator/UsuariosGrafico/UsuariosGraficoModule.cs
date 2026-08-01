namespace Veolia.Api.Modules.Regulator.UsuariosGrafico;

/// <summary>
/// Regulator / UsuariosGrafico module: consultas de usuarios (promedio y detalle)
/// backed by the VAUCO_USUARIOS Oracle store. The module owns its controller,
/// repository, contracts and DI registration.
/// </summary>
public static class UsuariosGraficoModule
{
    public static IServiceCollection AddUsuariosGraficoModule(this IServiceCollection services)
    {
        services.AddScoped<IUsuariosGraficoRepository, UsuariosGraficoRepository>();
        return services;
    }
}
