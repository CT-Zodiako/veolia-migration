using Veolia.Api.Modules.Reliquidaciones.Contracts;

namespace Veolia.Api.Modules.Reliquidaciones.Crear;

public interface IReliqCrearRepository
{
    Task<ReliquidacionDto?> CrearAsync(CrearReliquidacionRequestDto request, long usuarioId, CancellationToken cancellationToken);
    Task<IReadOnlyList<ReliquidacionDto>> GetReliquidacionesAsync(long? apsaId, CancellationToken cancellationToken);
    Task<ReliquidacionDto?> GetReliquidacionByApsAsync(long apsaId, CancellationToken cancellationToken);
    Task<bool> ActualizarAsync(ActualizarReliquidacionRequestDto request, long usuarioId, CancellationToken cancellationToken);
    Task<bool> EliminarAsync(long relqId, CancellationToken cancellationToken);
}
