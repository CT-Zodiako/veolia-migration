using System.ComponentModel.DataAnnotations;
using System.Text.Json.Nodes;

namespace Veolia.Api.Modules.Sui853.Operaciones;

// A class, not a positional record: MVC rejects records whose primary-constructor properties carry validation
// attributes (InvalidOperationException → every request answered 500).
public sealed class ResiduosGeneradosRequest(string apsId, int year, int month)
{
    [Required, RegularExpression(@"^[0-9]{1,38}$")] public string ApsId { get; } = apsId;
    [Range(1, 9999)] public int Year { get; } = year;
    [Range(1, 12)] public int Month { get; } = month;
}

public interface IResiduosGeneradosRepository
{
    Task<IReadOnlyList<Dictionary<string, object?>>> GetDetailAsync(ResiduosGeneradosRequest request, CancellationToken cancellationToken);
    Task<JsonObject?> GetSummaryAsync(CancellationToken cancellationToken);
}
