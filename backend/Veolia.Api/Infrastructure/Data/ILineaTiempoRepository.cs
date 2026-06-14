using Veolia.Api.Contracts.Proyecciones;

namespace Veolia.Api.Infrastructure.Data;

public interface ILineaTiempoRepository
{
    Task<IReadOnlyList<LineaTiempoRow>> GetByProyeccionAsync(long proyId, CancellationToken cancellationToken);
    Task<MutationResponse> UpsertAsync(LineaTiempoUpsertRequest request, CancellationToken cancellationToken);
}
