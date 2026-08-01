namespace Veolia.Api.Modules.Regulator.Facturacion;

public interface IFacturacionRepository
{
    Task<IReadOnlyList<IDictionary<string, object?>>> ConsultarAsync(string vista, int aps, int anno, int mes, CancellationToken cancellationToken);
}
