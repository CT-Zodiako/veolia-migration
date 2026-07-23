using Veolia.Api.Contracts.Proyecciones;

namespace Veolia.Api.Infrastructure.Data;

public interface IProyeccionRepository
{
    Task<IReadOnlyList<ProyeccionListItem>> ConsultaAsync(long apsaId, CancellationToken cancellationToken);
    Task<IReadOnlyList<ProyeccionListItem>> ConsultaGeneralAsync(long sisuId, CancellationToken cancellationToken);
    Task<ProyeccionDetail?> ConsultaProyAsync(long proyId, CancellationToken cancellationToken);
    Task<MutationResponse> CrearAsync(ProyeccionCreateRequest request, long usuarioId, CancellationToken cancellationToken);
    Task<MutationResponse> EditarAsync(long proyId, ProyeccionUpdateRequest request, CancellationToken cancellationToken);
    Task<MutationResponse> EliminarAsync(long proyId, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> UltimasTarifasAsync(long apsaId, CancellationToken cancellationToken);
}
