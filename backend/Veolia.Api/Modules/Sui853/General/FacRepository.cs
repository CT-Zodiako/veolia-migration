using System.Data.Common;
using System.Text.Json;
using System.Text.Json.Nodes;
using Dapper;
using Oracle.ManagedDataAccess.Types;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Sui853.General;

public interface IFacRepository
{
    Task<JsonObject> GetAsync(CancellationToken cancellationToken);
}

public sealed class FacRepository(IOracleConnectionFactory factory, ILogger<FacRepository> logger) : IFacRepository
{
    public const string FormatCode = "F853GR01";

    public async Task<JsonObject> GetAsync(CancellationToken cancellationToken)
    {
        using var connection = (DbConnection)factory.CreateConnection();
        await connection.OpenAsync(cancellationToken);
        var raw = await connection.ExecuteScalarAsync<object>(new CommandDefinition(
            "SELECT SUI.f_render_formato2(:codigo) AS json FROM dual", new { codigo = FormatCode },
            commandTimeout: 120, cancellationToken: cancellationToken));
        var payload = FacPayload.Parse(raw is OracleClob clob ? clob.Value : raw?.ToString());
        try
        {
            var title = await connection.ExecuteScalarAsync<string>(new CommandDefinition(
                "SELECT td.CODIGO || ' | ' || td.NOMBRE || ' | ' || td.DESCRIPCION FROM sui.TCAT_DOCUMENTO td WHERE td.CODIGO = :codigo",
                new { codigo = FormatCode }, commandTimeout: 120, cancellationToken: cancellationToken));
            FacPayload.ApplyTitle(payload, title);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { throw; }
        catch (DbException)
        {
            // Optional catalog enrichment must not discard a valid rendered format.
            logger.LogWarning("FAC title catalog unavailable; retaining rendered metadata.");
        }
        return payload;
    }
}

public static class FacPayload
{
    public static JsonObject Parse(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) throw new JsonException("Missing FAC payload.");
        var node = JsonNode.Parse(json);
        if (node is JsonValue value && value.TryGetValue<string>(out var nested)) node = JsonNode.Parse(nested);
        if (node is not JsonObject result || result["data"] is not JsonArray)
            throw new JsonException("Invalid FAC payload.");
        return result;
    }

    public static void ApplyTitle(JsonObject payload, string? title)
    {
        if (string.IsNullOrWhiteSpace(title)) return;
        // Do not replace unknown metadata shapes with an invented object.
        if (payload["meta"] is null) payload["meta"] = new JsonObject();
        if (payload["meta"] is JsonObject meta) meta["dialogHeader"] = title;
    }
}
