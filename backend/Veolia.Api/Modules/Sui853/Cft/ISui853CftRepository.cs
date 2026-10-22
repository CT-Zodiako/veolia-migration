using System.Text.Json.Nodes;

namespace Veolia.Api.Modules.Sui853.Cft;

public interface ISui853CftRepository
{
    Task<JsonObject?> GetFormatoAsync(string codigo, CancellationToken cancellationToken);
}
