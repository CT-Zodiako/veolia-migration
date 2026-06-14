using Dapper;
using Microsoft.Extensions.Logging;
using Oracle.ManagedDataAccess.Client;
using Oracle.ManagedDataAccess.Types;
using System.ComponentModel.DataAnnotations;
using System.Data;
using System.Data.Common;
using Veolia.Api.Contracts.Requests;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Infrastructure.Data;

public sealed class SuiRepository(IOracleConnectionFactory connectionFactory, ILogger<SuiRepository> logger) : ISuiRepository
{
    public async Task<IReadOnlyList<dynamic>> ConsultarFormatoAsync(string formato, int aps, int mes, int anno, CancellationToken cancellationToken)
    {
        var functionName = formato.ToUpperInvariant() switch
        {
            "F19" => "PK_SUI.fsui_f19",
            "F23" => "PK_SUI.fsui_f23",
            "F24" => "PK_SUI.fsui_f24",
            "F35" => "PK_SUI.fsui_f35",
            "F36" => "PK_SUI.fsui_f36",
            _ => throw new ValidationException("Formato no soportado para consulta SUI.")
        };

        using var connection = await OpenConnectionAsync(cancellationToken);
        return await QueryCursorAsync(connection, functionName, aps, mes, anno, cancellationToken);
    }

    public async Task<SuiProcesarResponse> ProcesarAsync(SuiProcesarRequest request, CancellationToken cancellationToken)
    {
        const string ejecutarSql = "BEGIN :res := PK_SUI.fsui_fejecutasui(:1,:2,:3,:4); END;";
        const string estadoSql = "BEGIN :res := PK_SUI.fsui_estado(:1,:2,:3); END;";

        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();
        try
        {
            var precheck = await GetCanCertificateInternalAsync(connection, transaction, request.Aps, request.Mes, request.Anno, cancellationToken);
            if (!precheck.PuedeProcesar)
            {
                await RegistrarAuditoriaAsync(connection, transaction, request.Usuario, request.Aps, request.Mes, request.Anno, "PRECHECK_FAIL", cancellationToken);
                transaction.Rollback();
                throw new PreconditionFailedException($"No es posible procesar SUI: {string.Join(" | ", precheck.Mensajes)}");
            }

            var ejecutarParams = new DynamicParameters();
            ejecutarParams.Add("res", dbType: DbType.Int32, direction: ParameterDirection.Output);
            ejecutarParams.Add("1", request.Aps);
            ejecutarParams.Add("2", request.Mes);
            ejecutarParams.Add("3", request.Anno);
            ejecutarParams.Add("4", request.Usuario);

            await connection.ExecuteAsync(new CommandDefinition(ejecutarSql, ejecutarParams, transaction: transaction, cancellationToken: cancellationToken));
            var returnCode = ejecutarParams.Get<int?>("res") ?? 1;

            var estadoParams = new DynamicParameters();
            estadoParams.Add("res", dbType: DbType.String, direction: ParameterDirection.Output, size: 200);
            estadoParams.Add("1", request.Aps);
            estadoParams.Add("2", request.Mes);
            estadoParams.Add("3", request.Anno);
            await connection.ExecuteAsync(new CommandDefinition(estadoSql, estadoParams, transaction: transaction, cancellationToken: cancellationToken));
            var estado = estadoParams.Get<string>("res") ?? "DESCONOCIDO";

            var formatosProcesados = await InferirFormatosProcesadosAsync(connection, transaction, request.Aps, request.Mes, request.Anno, cancellationToken);

            await RegistrarAuditoriaAsync(connection, transaction, request.Usuario, request.Aps, request.Mes, request.Anno, returnCode == 0 ? "OK" : $"ERROR_{returnCode}", cancellationToken);

            transaction.Commit();
            return new SuiProcesarResponse(returnCode == 0, formatosProcesados, estado);
        }
        catch
        {
            if (transaction.Connection is not null)
            {
                transaction.Rollback();
            }

            throw;
        }
    }

    public async Task<SuiComplementoResponse> GuardarComplementoAsync(SuiComplementoRequest request, CancellationToken cancellationToken)
    {
        const string mergeSql = @"MERGE INTO SUI_COMPLEMENTO tgt
USING (
    SELECT :1 AS APS_ID, :2 AS MES, :3 AS ANNO, :4 AS FORMATO, :5 AS COMP_ITEM, :6 AS COMP_DATA, :7 AS USUA_USUA
    FROM dual
) src
ON (tgt.APS_ID = src.APS_ID
    AND tgt.MES = src.MES
    AND tgt.ANNO = src.ANNO
    AND tgt.FORMATO = src.FORMATO
    AND tgt.COMP_ITEM = src.COMP_ITEM)
WHEN MATCHED THEN
    UPDATE SET tgt.COMP_DATA = src.COMP_DATA,
               tgt.USUA_USUA = src.USUA_USUA,
               tgt.COMP_FECHA = SYSDATE
WHEN NOT MATCHED THEN
    INSERT (COMP_ID, APS_ID, MES, ANNO, FORMATO, COMP_ITEM, COMP_DATA, COMP_FECHA, USUA_USUA)
    VALUES (SSUI_COMPLEMENTO.NEXTVAL, src.APS_ID, src.MES, src.ANNO, src.FORMATO, src.COMP_ITEM, src.COMP_DATA, SYSDATE, src.USUA_USUA)";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var filasAfectadas = 0;
        foreach (var item in request.ComplementoData)
        {
            var parameters = new DynamicParameters();
            parameters.Add("1", request.Aps);
            parameters.Add("2", request.Mes);
            parameters.Add("3", request.Anno);
            parameters.Add("4", request.Formato.ToUpperInvariant());
            parameters.Add("5", item.Item);
            parameters.Add("6", item.Valor);
            parameters.Add("7", "SUI_INTEGRACION");

            filasAfectadas += await connection.ExecuteAsync(new CommandDefinition(mergeSql, parameters, cancellationToken: cancellationToken));
        }

        return new SuiComplementoResponse(true, filasAfectadas);
    }

    public async Task<SuiPrecheckResponse> GetCanCertificateAsync(int aps, int mes, int anno, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        return await GetCanCertificateInternalAsync(connection, transaction: null, aps, mes, anno, cancellationToken);
    }

    private async Task<SuiPrecheckResponse> GetCanCertificateInternalAsync(IDbConnection connection, IDbTransaction? transaction, int aps, int mes, int anno, CancellationToken cancellationToken)
    {
        const string sql = "BEGIN :res := PK_VALGRAL.fauco_generasui(:1,:2,:3); END;";

        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.String, direction: ParameterDirection.Output, size: 4000);
        parameters.Add("1", aps);
        parameters.Add("2", anno);
        parameters.Add("3", mes);

        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, transaction: transaction, cancellationToken: cancellationToken));

        var resultado = (parameters.Get<string>("res") ?? string.Empty).Trim();
        var mensajes = string.IsNullOrWhiteSpace(resultado)
            ? Array.Empty<string>()
            : resultado.Split('|', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

        var puedeProcesar = mensajes.Length == 0 || mensajes.All(m => m is "0" or "1" or "OK");
        return new SuiPrecheckResponse(puedeProcesar, mensajes);
    }

    private static async Task<IReadOnlyList<dynamic>> QueryCursorAsync(IDbConnection connection, string functionName, int aps, int mes, int anno, CancellationToken cancellationToken)
    {
        if (connection is not OracleConnection oracleConnection)
        {
            throw new InvalidOperationException("La conexión Oracle no está disponible para consultar cursores SUI.");
        }

        await using var command = oracleConnection.CreateCommand();
        command.BindByName = false;
        command.CommandText = $"BEGIN :res := {functionName}(:1,:2,:3); END;";
        command.CommandType = CommandType.Text;

        command.Parameters.Add(new OracleParameter("res", OracleDbType.RefCursor, ParameterDirection.ReturnValue));
        command.Parameters.Add(new OracleParameter("1", OracleDbType.Int32, aps, ParameterDirection.Input));
        command.Parameters.Add(new OracleParameter("2", OracleDbType.Int32, mes, ParameterDirection.Input));
        command.Parameters.Add(new OracleParameter("3", OracleDbType.Int32, anno, ParameterDirection.Input));

        await command.ExecuteNonQueryAsync(cancellationToken);

        var rows = new List<dynamic>();
        using var reader = ((OracleRefCursor)command.Parameters[0].Value).GetDataReader();
        while (await reader.ReadAsync(cancellationToken))
        {
            var row = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < reader.FieldCount; i++)
            {
                row[reader.GetName(i)] = await reader.IsDBNullAsync(i, cancellationToken) ? null : reader.GetValue(i);
            }

            rows.Add(row);
        }

        return rows;
    }

    private static async Task<IReadOnlyList<string>> InferirFormatosProcesadosAsync(IDbConnection connection, IDbTransaction transaction, int aps, int mes, int anno, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT 'F19' AS FORMATO FROM SUI_F19 WHERE APS_ID = :aps AND MES = :mes AND ANNO = :anno
UNION ALL
SELECT 'F23' AS FORMATO FROM SUI_F23 WHERE APS_ID = :aps AND MES = :mes AND ANNO = :anno
UNION ALL
SELECT 'F24' AS FORMATO FROM SUI_F24 WHERE APS_ID = :aps AND MES = :mes AND ANNO = :anno
UNION ALL
SELECT 'F35' AS FORMATO FROM SUI_F35 WHERE APS_ID = :aps AND MES = :mes AND ANNO = :anno
UNION ALL
SELECT 'F36' AS FORMATO FROM SUI_F36 WHERE APS_ID = :aps AND MES = :mes AND ANNO = :anno";

        var formatos = await connection.QueryAsync<string>(new CommandDefinition(sql, new { aps, mes, anno }, transaction: transaction, cancellationToken: cancellationToken));
        return formatos.Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    }

    private async Task RegistrarAuditoriaAsync(IDbConnection connection, IDbTransaction transaction, int usuario, int aps, int mes, int anno, string resultado, CancellationToken cancellationToken)
    {
        const string sql = @"INSERT INTO SUI_AUDITORIA (USUARIO, FECHA, APS_ID, MES, ANNO, RESULTADO)
VALUES (:usuario, SYSDATE, :aps, :mes, :anno, :resultado)";

        try
        {
            await connection.ExecuteAsync(new CommandDefinition(sql, new { usuario, aps, mes, anno, resultado }, transaction: transaction, cancellationToken: cancellationToken));
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "No fue posible persistir auditoría SUI. usuario={Usuario} aps={Aps} mes={Mes} anno={Anno} resultado={Resultado}", usuario, aps, mes, anno, resultado);
        }

        logger.LogInformation("SUI ejecución auditada. usuario={Usuario} fecha={Fecha} aps={Aps} mes={Mes} anno={Anno} resultado={Resultado}", usuario, DateTime.UtcNow, aps, mes, anno, resultado);
    }

    private async Task<IDbConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        var connection = connectionFactory.CreateConnection();
        if (connection is DbConnection dbConnection)
        {
            await dbConnection.OpenAsync(cancellationToken);
        }
        else
        {
            connection.Open();
        }

        return connection;
    }
}
