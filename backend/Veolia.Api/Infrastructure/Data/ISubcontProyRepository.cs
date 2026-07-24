using Veolia.Api.Contracts.Proyecciones;

namespace Veolia.Api.Infrastructure.Data;

public interface ISubcontProyRepository
{
    Task<IReadOnlyList<SubcontItem>> GetSubcontAsync(SubcontConsultaRequest request, CancellationToken cancellationToken);
    Task<MutationResponse> UpsertSubcontAsync(SubcontUpsertRequest request, long usuarioId, CancellationToken cancellationToken);
    Task<IReadOnlyList<ClaseUsoItem>> GetClasesUsoAsync(CancellationToken cancellationToken);
}
