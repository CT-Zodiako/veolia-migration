namespace Veolia.Api.Modules.Regulator.Facturacion;

/// <summary>
/// Regulator / Facturacion module: consulta de facturación, detalle, clúster, DINC y
/// factura electrónica sobre las vistas Oracle VACUO_*. The module owns its controller,
/// repository, contracts and DI registration.
/// </summary>
public static class FacturacionModule
{
    public static IServiceCollection AddFacturacionModule(this IServiceCollection services)
    {
        services.AddScoped<IFacturacionRepository, FacturacionRepository>();
        return services;
    }
}
