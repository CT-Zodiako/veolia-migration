using Veolia.Api.Contracts.Responses;

namespace Veolia.Api.Infrastructure.Data.Interfaces;

public interface ITafnaRepository
{
    Task<IReadOnlyList<TafnaResponse>> GetTafnaAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
}
