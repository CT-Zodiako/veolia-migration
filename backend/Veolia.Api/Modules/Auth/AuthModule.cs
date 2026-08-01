using Veolia.Api.Modules.Auth.Asignaciones;
using Veolia.Api.Modules.Auth.Login;
using Veolia.Api.Modules.Auth.Menu;
using Veolia.Api.Modules.Auth.Usuarios;

namespace Veolia.Api.Modules.Auth;

/// <summary>
/// Auth module: login y selección de sistema, CRUD de usuarios y cambio/reset de
/// clave, menú por permisos y asignaciones de APS/sistemas por usuario backed by
/// the Oracle store. The module owns its controllers, repositories, contracts,
/// contract mapper and DI registration.
/// </summary>
public static class AuthModule
{
    public static IServiceCollection AddAuthModule(this IServiceCollection services)
    {
        services.AddScoped<ILoginRepository, LoginRepository>();
        services.AddScoped<IUsuariosRepository, UsuariosRepository>();
        services.AddScoped<IMenuRepository, MenuRepository>();
        services.AddScoped<IAsignacionesRepository, AsignacionesRepository>();
        services.AddScoped<AuthContractMapper>();
        return services;
    }
}
