namespace Veolia.Api.Modules.Regulator.Proyecciones;

public interface ILineaTiempoRepository
{
    Task<IReadOnlyList<LineaTiempoRow>> GetByProyeccionAsync(long proyId, CancellationToken cancellationToken);
    Task<MutationResponse> UpsertAsync(LineaTiempoUpsertRequest request, long usuarioId, CancellationToken cancellationToken);
}
