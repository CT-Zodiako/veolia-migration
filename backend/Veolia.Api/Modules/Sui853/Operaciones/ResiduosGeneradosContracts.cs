using System.ComponentModel.DataAnnotations;
using System.Text.Json.Nodes;

namespace Veolia.Api.Modules.Sui853.Operaciones;

public sealed record ResiduosGeneradosRequest(
    [property: Required, RegularExpression(@"^[0-9]{1,38}$")] string ApsId,
    [property: Range(1, 9999)] int Year,
    [property: Range(1, 12)] int Month);

public interface IResiduosGeneradosRepository
{
    Task<IReadOnlyList<Dictionary<string, object?>>> GetDetailAsync(ResiduosGeneradosRequest request, CancellationToken cancellationToken);
    Task<JsonObject?> GetSummaryAsync(CancellationToken cancellationToken);
}
