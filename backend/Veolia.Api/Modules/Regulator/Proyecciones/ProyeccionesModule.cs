namespace Veolia.Api.Modules.Regulator.Proyecciones;

/// <summary>
/// Regulator / Proyecciones module: proyecciones de tarifas (consulta, creación, edición,
/// eliminación), línea de tiempo, crecimiento de variables programadas (incluida la carga
/// desde Google Drive vía CrecimientoDriveService), subsidios y contribuciones (subcont) y
/// ejecución de la proyección backed by the Oracle store. The module owns its controller,
/// repositories, drive service, contracts and DI registration.
/// </summary>
public static class ProyeccionesModule
{
    public static IServiceCollection AddProyeccionesModule(this IServiceCollection services)
    {
        services.AddScoped<IProyeccionRepository, ProyeccionRepository>();
        services.AddScoped<ILineaTiempoRepository, LineaTiempoRepository>();
        services.AddScoped<ICrecimientoRepository, CrecimientoRepository>();
        services.AddScoped<ISubcontProyRepository, SubcontProyRepository>();
        services.AddScoped<IEjecucionProyeccionRepository, EjecucionProyeccionRepository>();
        services.AddScoped<ICrecimientoDriveService, CrecimientoDriveService>();
        return services;
    }
}
