namespace Veolia.Api.Infrastructure.Data.Interfaces;

public interface IFacturacionRepository
{
    Task<IReadOnlyList<IDictionary<string, object?>>> ConsultarAsync(string vista, int aps, int anno, int mes, CancellationToken cancellationToken);
}
