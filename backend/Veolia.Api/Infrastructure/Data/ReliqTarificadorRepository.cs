using System.Text.Json;
using Dapper;
using Oracle.ManagedDataAccess.Client;
using Veolia.Api.Contracts.Reliquidacion;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Infrastructure.Data;

public sealed class ReliqTarificadorRepository(IOracleConnectionFactory connectionFactory) : IReliqTarificadorRepository
{
    public Task<ResumenResponseDto?> ResumenUsuariosAsync(long reliqId, CancellationToken cancellationToken)
        => ExecuteResumenAsync("SELECT reliq.pkrei_updtarifador.fnrei_previsualizar_iuae(:1) AS resumen FROM dual", reliqId, cancellationToken);

    public Task<ResumenResponseDto?> ResumenEmpresaAsync(long reliqId, CancellationToken cancellationToken)
        => ExecuteResumenAsync("SELECT reliq.pkrei_updtarifador.fnrei_previsualizar_ined(:1) AS resumen FROM dual", reliqId, cancellationToken);

    public Task<ResumenResponseDto?> ResumenAdicionalAsync(long reliqId, CancellationToken cancellationToken)
        => ExecuteResumenAsync("SELECT reliq.pkrei_updtarifador.fnrei_previsualizar_cead(:1) AS resumen FROM dual", reliqId, cancellationToken);

    public Task<ResumenResponseDto?> ResumenRellenoAsync(long reliqId, CancellationToken cancellationToken)
        => ExecuteResumenAsync("SELECT reliq.pkrei_updtarifador.fnrei_previsualizar_iare(:1) AS resumen FROM dual", reliqId, cancellationToken);

    public Task<ResumenResponseDto?> ResumenApsAsync(long reliqId, CancellationToken cancellationToken)
        => ExecuteResumenAsync("SELECT reliq.pkrei_updtarifador.fnrei_previsualizar(:1) AS resumen FROM dual", reliqId, cancellationToken);

    public async Task<AprobarReliquidacionResultadoDto> AprobarReliquidacionAsync(long reliqId, long usuarioId, CancellationToken cancellationToken)
    {
        const string sql = @"
            BEGIN
                :1 := PKREI_APLICARRELIQUIDA.fnrei_aplicartodo(:2, :3);
            END;";

        var parameters = new DynamicParameters();
        parameters.Add("1", dbType: System.Data.DbType.String, size: 4000, direction: System.Data.ParameterDirection.Output);
        parameters.Add("2", reliqId);
        parameters.Add("3", usuarioId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        var raw = parameters.Get<string>("1");
        return ParseAprobarResultado(raw);
    }

    public async Task<string?> EstadoReliquidacionAsync(long reliqId, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT RELQESTADO
              FROM RELQRELIQUIDA
             WHERE RELQID = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", reliqId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var estado = await connection.QueryFirstOrDefaultAsync<string>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));

        // Defensivo, igual que el legacy (tarificador/controller.js:16, `.trim()`): si la
        // columna Oracle real es CHAR con padding en vez de VARCHAR2, esto evita que la
        // comparación de catálogo ('1'/'2') falle por espacios finales. No se pudo confirmar
        // el tipo de columna real (schema RELIQ no disponible en dev), pero el trim es inocuo
        // sobre un VARCHAR2 sin padding.
        return estado?.Trim();
    }

    /// <summary>
    /// La PL/SQL real (reliq.pkrei_aplicarreliquida.fnrei_aplicartodo) devuelve JSON:
    /// {"mensaje":..., "codmes":..., "resultados":{iaed,ined,iare,iuae,cead}} (ver
    /// legacy tarificador/controller.js:205-227). A veces el valor llega doblemente
    /// serializado (una cadena JSON que contiene otra cadena JSON) por cómo Oracle
    /// serializa el CLOB/VARCHAR2 de salida; en ese caso se vuelve a parsear.
    /// </summary>
    private static AprobarReliquidacionResultadoDto ParseAprobarResultado(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return new AprobarReliquidacionResultadoDto { RawResultado = raw };
        }

        var parsed = TryParseJson(raw);

        // Doble parseo: si el primer JSON.parse-equivalente da como resultado una cadena
        // (en vez de un objeto), esa cadena es a su vez JSON y hay que parsearla de nuevo.
        if (parsed is { ValueKind: JsonValueKind.String } stringElement)
        {
            var inner = TryParseJson(stringElement.GetString());
            if (inner is not null)
            {
                parsed = inner;
            }
        }

        if (parsed is null || parsed.Value.ValueKind != JsonValueKind.Object)
        {
            return new AprobarReliquidacionResultadoDto { Mensaje = raw, RawResultado = raw };
        }

        var obj = parsed.Value;
        var mensaje = obj.TryGetProperty("mensaje", out var mensajeEl) ? mensajeEl.GetString() : null;
        var codmes = obj.TryGetProperty("codmes", out var codmesEl)
            ? (codmesEl.ValueKind == JsonValueKind.String ? codmesEl.GetString() : codmesEl.ToString())
            : null;

        AprobarReliquidacionContadoresDto? contadores = null;
        if (obj.TryGetProperty("resultados", out var resultadosEl) && resultadosEl.ValueKind == JsonValueKind.Object)
        {
            contadores = new AprobarReliquidacionContadoresDto
            {
                Iaed = GetIntOrDefault(resultadosEl, "iaed"),
                Ined = GetIntOrDefault(resultadosEl, "ined"),
                Iare = GetIntOrDefault(resultadosEl, "iare"),
                Iuae = GetIntOrDefault(resultadosEl, "iuae"),
                Cead = GetIntOrDefault(resultadosEl, "cead")
            };
        }

        return new AprobarReliquidacionResultadoDto
        {
            Mensaje = mensaje,
            Codmes = codmes,
            Resultados = contadores,
            RawResultado = raw
        };
    }

    private static JsonElement? TryParseJson(string? text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<JsonElement>(text);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static int GetIntOrDefault(JsonElement obj, string propertyName)
    {
        if (!obj.TryGetProperty(propertyName, out var value))
        {
            return 0;
        }

        return value.ValueKind switch
        {
            JsonValueKind.Number when value.TryGetInt32(out var n) => n,
            JsonValueKind.String when int.TryParse(value.GetString(), out var n) => n,
            _ => 0
        };
    }

    private async Task<ResumenResponseDto?> ExecuteResumenAsync(string sql, long reliqId, CancellationToken cancellationToken)
    {
        var parameters = new DynamicParameters();
        parameters.Add("1", reliqId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var row = await connection.QueryFirstOrDefaultAsync<ResumenRow>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        if (row is null || string.IsNullOrWhiteSpace(row.Resumen))
            return null;

        object? parsed;
        try
        {
            parsed = JsonSerializer.Deserialize<object>(row.Resumen);
        }
        catch
        {
            parsed = row.Resumen;
        }

        return new ResumenResponseDto { Resumen = parsed };
    }

    private async Task<OracleConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        var connection = connectionFactory.CreateConnection();
        if (connection is not OracleConnection oracleConnection)
        {
            throw new InvalidOperationException("OracleConnectionFactory must return OracleConnection.");
        }

        if (oracleConnection.State != System.Data.ConnectionState.Open)
        {
            await oracleConnection.OpenAsync(cancellationToken);
        }

        return oracleConnection;
    }

    private sealed class ResumenRow
    {
        public string Resumen { get; set; } = string.Empty;
    }
}
