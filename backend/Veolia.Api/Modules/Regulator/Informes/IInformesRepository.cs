
namespace Veolia.Api.Modules.Regulator.Informes;

public interface IInformesRepository
{
    Task<InformeCostosResponse?> GetResumenVariablesAsync(int aps, int anno, int mes, CancellationToken cancellationToken);

    Task<InformeCostosResponse?> GetClusJsonAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
}
