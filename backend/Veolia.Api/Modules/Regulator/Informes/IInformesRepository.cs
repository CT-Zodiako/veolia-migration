
namespace Veolia.Api.Modules.Regulator.Informes;

public interface IInformesRepository
{
    Task<System.Text.Json.Nodes.JsonObject?> GetResumenVariablesAsync(int aps, int anno, int mes, CancellationToken cancellationToken);

    Task<System.Text.Json.Nodes.JsonObject?> GetClusJsonAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
}
