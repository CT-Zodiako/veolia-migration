using Veolia.Api.Contracts.Responses;

namespace Veolia.Api.Infrastructure.Data.Interfaces;

public interface ITrnaRepository
{
    Task<IReadOnlyList<TrnaResponse>> GetTrnaAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
}
