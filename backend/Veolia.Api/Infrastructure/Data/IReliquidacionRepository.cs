using Veolia.Api.Contracts.Reliquidacion;

namespace Veolia.Api.Infrastructure.Data;

public interface IReliquidacionRepository
{
    Task<IReadOnlyList<ReliquidacionDto>> GetReliquidacionesAsync(long apsaId, CancellationToken cancellationToken);
    Task<ReliquidacionDto?> GetReliquidacionAsync(long relqId, CancellationToken cancellationToken);
    Task<long> CrearAsync(CrearReliquidacionRequestDto request, long usuarioId, CancellationToken cancellationToken);
    Task<bool> ActualizarAsync(ActualizarReliquidacionRequestDto request, long usuarioId, CancellationToken cancellationToken);
    Task<bool> EliminarAsync(long relqId, long usuarioId, CancellationToken cancellationToken);
}
