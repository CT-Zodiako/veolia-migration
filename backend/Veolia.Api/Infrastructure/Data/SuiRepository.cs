using Dapper;
using Microsoft.Extensions.Logging;
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
    public async Task<SuiDashboardResponse> DashboardAsync(int anno, int mes, long usuario, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT * FROM TABLE(PK_SUI.fsui_estado(:anno, :mes)) p
    INNER JOIN auco_apsusuarios u ON p.apsid = u.apsa_id
    WHERE u.SISU_ID = :usuario and u.apsi_estado = 1";

        var parameters = new DynamicParameters();
        parameters.Add("anno", anno);
        parameters.Add("mes", mes);
        parameters.Add("usuario", usuario);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        var filas = rows.Select(ToDictionaryObject).ToList();
        return new SuiDashboardResponse(filas);
    }

    public async Task<IReadOnlyList<dynamic>> ConsultarFormatoAsync(string formato, int aps, int mes, int anno, CancellationToken cancellationToken)
    {
        var sql = formato.ToUpperInvariant() switch
        {
            "F19" => @"
                SELECT APSA_ID, F19_ANNO, F19_MES, F19_NJ, F19_NDJ, F19_CRTJ, F19_CDFJ, F19_QRTJ, F19_QRJ, F19_QBLJ, F19_QLUJ, F19_QNAZ, F19_QAJ, F19_FECHA, USUARIO
                FROM TARIFICADOR.SUI_F19
                WHERE apsa_id = :aps AND f19_anno = :anno AND f19_mes = :mes",
            "F23" => @"
                SELECT APSA_ID, EMPR_EMPR, F23_ANNO, F23_MES, F23_ID, F23_NUAP, F23_N, F23_CP, F23_CCC, F23_M2CCJ, F23_CLAVJ, F23_M3AGUAJ, F23_M2LAVJ, F23_CLPJ, F23_KLPJ, F23_CCEI, F23_TIJ, F23_CCEMJ, F23_TMJ, F23_CLUS, F23_CBLJ, F23_LBLJ, F23_CBLS, F23_FACBLCLUS, F23_ABC, F23_FECHA, USUARIO
                FROM TARIFICADOR.SUI_F23
                WHERE apsa_id = :aps AND f23_anno = :anno AND f23_mes = :mes",
            "F24" => @"
                SELECT APSA_ID, F24_ANNO, F24_MES, F24_NUAP, F24_NUSD, F24_CENTROIDE, F24_QRT, F24_F1, F24_F2, F24_CPE, F24_PRTZ, F24_DET, F24_F1ET, F24_CPEET, F24_PRTZET, F24_CEG, F24_CRTP, F24_SALINIDAD, F24_VACRTABC, F24_VACRT, F24_FCK, F24_T, F24_CRTZ, F24_CRT, F24_FACRT, F24_FACCS, F24_FECHA, USUARIO
                FROM TARIFICADOR.SUI_F24
                WHERE apsa_id = :aps AND f24_anno = :anno AND f24_mes = :mes",
            "F35" => @"
                SELECT APSA_ID, F35_ANNO, F35_MES, F35_NUSD, F35_NOMDF, F35_CAMRERS, F35_QRSMES, F35_QRSPROM, F35_CDFVU, F35_PERADDT, F35_CDFPC, F35_INCENTIVO, F35_DISPALT9, F35_INCCDFALT9, F35_VACDFABC, F35_VACDF, F35_PRCTCRRCP, F35_CDF, F35_CDFP, F35_FACCDF, F35_V0, F35_VM, F35_MCRS, F35_ICRSM, F35_ICCRS, F35_FREIN, F35_CAPREMDF, F35_FECHA, USUARIO
                FROM TARIFICADOR.SUI_F35
                WHERE apsa_id = :aps AND f35_anno = :anno AND f35_mes = :mes",
            "F36" => @"
                SELECT APSA_ID, F36_ANNO, F36_MES, F36_NUSD, F36_NOMDPTO, F36_NOMMPIO, F36_NOMDF, F36_VLMES, F36_VLMPROM, F36_ESCENA, F36_CTLMVU, F36_ANNOPOSCLA, F36_CTLMPC, F36_CTLM, F36_CTLMX, F36_VACTLABC, F36_VACTL, F36_FCKCTL, F36_QRS, F36_CTL, F36_FACCTL, F36_FECHA, USUARIO
                FROM TARIFICADOR.SUI_F36
                WHERE apsa_id = :aps AND f36_anno = :anno AND f36_mes = :mes",
            _ => throw new ValidationException("Formato no soportado para consulta SUI.")
        };

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(new CommandDefinition(sql, new { aps, anno, mes }, cancellationToken: cancellationToken));
        return rows.Select(ToDictionaryObject).ToList();
    }

    public async Task<IReadOnlyList<object>> ResumenFormatosAsync(string formato, int aps, CancellationToken cancellationToken)
    {
        var tableName = formato.ToUpperInvariant() switch
        {
            "F19" => "TARIFICADOR.SUI_F19",
            "F23" => "TARIFICADOR.SUI_F23",
            "F24" => "TARIFICADOR.SUI_F24",
            "F35" => "TARIFICADOR.SUI_F35",
            "F36" => "TARIFICADOR.SUI_F36",
            _ => throw new ValidationException("Formato no soportado para resumen de formatos SUI.")
        };

        var sql = $"SELECT * FROM {tableName} WHERE apsa_id = :aps";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(new CommandDefinition(sql, new { aps }, cancellationToken: cancellationToken));
        return rows.Select(ToDictionaryObject).ToList();
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

    private static object ToDictionaryObject(dynamic row)
    {
        if (row is IDictionary<string, object> dictionary)
        {
            return new Dictionary<string, object>(dictionary, StringComparer.OrdinalIgnoreCase);
        }

        var objectDictionary = (IDictionary<string, object>)row;
        return new Dictionary<string, object>(objectDictionary, StringComparer.OrdinalIgnoreCase);
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
