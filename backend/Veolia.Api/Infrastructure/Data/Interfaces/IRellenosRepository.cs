using Veolia.Api.Contracts.Requests;
using Veolia.Api.Contracts.Responses;

namespace Veolia.Api.Infrastructure.Data.Interfaces;

public interface IRellenosRepository
{
    Task<IReadOnlyList<RellenoResponse>> ListarAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<RellenoResponse>> ConsultarAsync(RellenoRequest request, CancellationToken cancellationToken);
    Task<object?> CrearAsync(CrearRellenoRequest request, long sisuId, CancellationToken cancellationToken);
    Task<object?> EditarAsync(long id, EditarRellenoRequest request, CancellationToken cancellationToken);
    Task<object?> EliminarAsync(long id, CancellationToken cancellationToken);
}
