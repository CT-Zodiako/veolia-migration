using Veolia.Api.Contracts.Responses;

namespace Veolia.Api.Infrastructure.Data.Interfaces;

public interface IKillometrosRepository
{
    Task<IReadOnlyList<LblResponse>> GetLblAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
}
