namespace Veolia.Api.Infrastructure.Data;

public interface IEmpresasRepository
{
    Task<IReadOnlyList<object>> GetAllAsync(CancellationToken cancellationToken);
    Task<object?> CreateAsync(string nombre, int estado, int propia, string? nuap, long sisuId, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> ConsultarPropiasAsync(long aps, int propia, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> ConsultaEmprAsync(long empr, CancellationToken cancellationToken);
    Task<object?> UpdateAsync(long id, string nombre, int estado, int propia, string? nuap, CancellationToken cancellationToken);
    Task<object?> EliminarAsync(long id, CancellationToken cancellationToken);
    Task<object?> ToggleEstadoAsync(long id, CancellationToken cancellationToken);
}
