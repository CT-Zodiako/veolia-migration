using Veolia.Api.Contracts.Indices;

namespace Veolia.Api.Infrastructure.Data;

public interface IIndicesRepository
{
    Task<IReadOnlyList<IndicesResponseDto>> GetByPeriodAsync(int anno, int mes, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<IndicesResponseDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<IndicesResponseDto?> GetByIdAsync(long id, CancellationToken cancellationToken = default);
    Task<long> CrearAsync(IndicesCrearRequestDto dto, long usuarioId, CancellationToken cancellationToken = default);
    Task<bool> EditarAsync(IndicesEditarRequestDto dto, CancellationToken cancellationToken = default);
    Task<bool> EliminarAsync(long indiceTipoId, int anno, int mes, CancellationToken cancellationToken = default);
}
