using Veolia.Api.Contracts.Productividad;

namespace Veolia.Api.Infrastructure.Data;

public interface IProductividadRepository
{
    Task<ProductividadResponseDto?> ConsultarAsync(int aps, int anno, int mes, CancellationToken cancellationToken = default);
    Task CrearAsync(int aps, int anno, int mes, decimal valor, long usuarioId, CancellationToken cancellationToken = default);
    Task<bool> EditarAsync(int aps, int anno, int mes, decimal valor, CancellationToken cancellationToken = default);
}
