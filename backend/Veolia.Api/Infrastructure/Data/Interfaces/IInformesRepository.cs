using Veolia.Api.Contracts.Responses;

namespace Veolia.Api.Infrastructure.Data.Interfaces;

public interface IInformesRepository
{
    Task<InformeCostosResponse?> GetResumenVariablesAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
}
