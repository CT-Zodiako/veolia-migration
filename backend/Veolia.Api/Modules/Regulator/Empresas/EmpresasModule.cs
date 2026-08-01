namespace Veolia.Api.Modules.Regulator.Empresas;

/// <summary>
/// Regulator / Empresas module: empresas (consulta, creación, edición,
/// eliminación y toggle de estado) backed by the AUGE_EMPRESAS Oracle store.
/// The module owns its controller, repository and DI registration.
/// </summary>
public static class EmpresasModule
{
    public static IServiceCollection AddEmpresasModule(this IServiceCollection services)
    {
        services.AddScoped<IEmpresasRepository, EmpresasRepository>();
        return services;
    }
}
