using Veolia.Api.Modules.Reliquidaciones.Cargue;
using Veolia.Api.Modules.Reliquidaciones.Crear;
using Veolia.Api.Modules.Reliquidaciones.Tarificador;

namespace Veolia.Api.Modules.Reliquidaciones;

/// <summary>
/// Reliquidaciones module: cargue (comparar costos/tarifas), crear (ABM de
/// reliquidaciones) and tarificador (resúmenes y aprobación) backed by the
/// reliq Oracle packages. The module owns its controllers, repositories,
/// contracts and DI registration.
/// </summary>
public static class ReliquidacionesModule
{
    public static IServiceCollection AddReliquidacionesModule(this IServiceCollection services)
    {
        services.AddScoped<IReliqCrearRepository, ReliqCrearRepository>();
        services.AddScoped<IReliqCargueRepository, ReliqCargueRepository>();
        services.AddScoped<IReliqTarificadorRepository, ReliqTarificadorRepository>();
        return services;
    }
}
