using System.Text.Json;
using Dapper;
using Oracle.ManagedDataAccess.Client;
using Veolia.Api.Contracts.Reliquidacion;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Infrastructure.Data;

public sealed class ReliqCargueRepository(IOracleConnectionFactory connectionFactory) : IReliqCargueRepository
{
    public async Task<string?> CompararCostosCargueAsync(long reliq, long apsaId, CancellationToken cancellationToken)
    {
        const string sql = @"
            BEGIN
                :1 := PK_RELIQUIDAR.freli_reliquidar(:2, :3);
            END;";

        var parameters = new DynamicParameters();
        parameters.Add("1", dbType: System.Data.DbType.String, size: 4000, direction: System.Data.ParameterDirection.Output);
        parameters.Add("2", reliq);
        parameters.Add("3", apsaId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return parameters.Get<string>("1");
    }

    public async Task<IReadOnlyList<CompararCostosResponseDto>> CompararCostosAsync(long reliq, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT COD_RELIQ AS CodReliq,
                   APSA_ID AS ApsaId,
                   RELQDESDE AS RelqDesde,
                   RELQHASTA AS RelqHasta,
                   COSTO_APS AS CostoAps,
                   COSTO_EMPRESA AS CostoEmpresa,
                   DIF_COSTO AS DifCosto
              FROM VREL_COMPARACOSTOS
             WHERE COD_RELIQ = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", reliq);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<CompararCostosResponseDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<CompararTarifasResponseDto>> CompararTarifasAsync(long reliq, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT RELI AS Reli,
                   APSA_ID AS ApsaId,
                   TARIFA_APS AS TarifaAps,
                   TARIFA_EMPRESA AS TarifaEmpresa,
                   DIF_TARIFA AS DifTarifa
              FROM VREL_COMPARATARIFACOBRO
             WHERE RELI = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", reliq);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<CompararTarifasResponseDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<ResumenCompararTarifasResponseDto?> ResumenCompararTarifasAsync(long reliq, long apsaId, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT reliq.PK_JSONRESUMEN.freli_jsongral(:1,:2,:3,:4) AS json_trna
              FROM dual";

        var parameters = new DynamicParameters();
        parameters.Add("1", reliq);
        parameters.Add("2", apsaId);
        parameters.Add("3", anno);
        parameters.Add("4", mes);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var row = await connection.QueryFirstOrDefaultAsync<ResumenRow>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        if (row is null || string.IsNullOrWhiteSpace(row.JsonTrna))
            return null;

        var parsed = JsonSerializer.Deserialize<object>(row.JsonTrna);
        return new ResumenCompararTarifasResponseDto { JsonTrna = parsed };
    }

    public async Task<IReadOnlyList<ReliInfoUsuariosDto>> GetReliInfoUsuariosAsync(long idReliq, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT U.IUAE_ID AS IuaeId,
                   U.RELI_ID AS ReliId,
                   U.CODUSO AS CodUso,
                   U.CODTIPOPRED AS CodTipoPred,
                   U.CANTIDAD AS Cantidad,
                   U.TONELADAS AS Toneladas
              FROM RELI_INFUSUAPSEMPRDIVI U
              JOIN RELQRELIQUIDA R ON R.RELQID = U.RELI_ID
             WHERE U.RELI_ID = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", idReliq);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ReliInfoUsuariosDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<ReliInfoEmpresaDto>> GetResumenEmpresaAsync(long idReliq, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT INED_ID AS InedId,
                   RELI_ID AS ReliId,
                   CBLJ AS Cblj,
                   COSTO AS Costo,
                   TARIFA AS Tarifa
              FROM RELI_INFOEMPRDIVI
             WHERE RELI_ID = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", idReliq);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ReliInfoEmpresaDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<ReliInfoApsDto>> GetResumenApsAsync(long idReliq, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT IAED_ID AS IaedId,
                   RELI_ID AS ReliId,
                   QRTZ AS Qrtz,
                   COSTO AS Costo,
                   TARIFA AS Tarifa
              FROM RELI_INFOAPSEMPRDIVI
             WHERE RELI_ID = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", idReliq);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ReliInfoApsDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<ReliInfoRellenoDto>> GetResumenRellenoAsync(long idReliq, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT IARE_ID AS IareId,
                   RELI_ID AS ReliId,
                   QRS AS Qrs,
                   COSTO AS Costo,
                   TARIFA AS Tarifa
              FROM RELI_INFOAPSRELLENO
             WHERE RELI_ID = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", idReliq);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ReliInfoRellenoDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<ReliInfoAdicionalDto>> GetReliInfoAdicionalAsync(long idReliq, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT CEAD_ID AS CeadId,
                   RELI_ID AS ReliId,
                   CDF AS Cdf,
                   CTL AS Ctl
              FROM RELI_INFOADICIONAL
             WHERE RELI_ID = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", idReliq);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ReliInfoAdicionalDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public Task<int> UpdateReliInfoUsuariosAsync(IReadOnlyList<UpdateReliInfoUsuariosRequestDto> items, long userId, CancellationToken cancellationToken)
        => ExecuteBatchUpdateAsync(
            @"UPDATE RELI_INFUSUAPSEMPRDIVI
                 SET CODUSO = :1,
                     CODTIPOPRED = :2,
                     CANTIDAD = :3,
                     TONELADAS = :4,
                     USUA_USUA = :5,
                     FECHA = SYSDATE
               WHERE IUAE_ID = :6
                 AND RELI_ID = :7",
            items,
            userId,
            (parameters, row, uid) =>
            {
                parameters.Add("1", row.CodUso);
                parameters.Add("2", row.CodTipoPred);
                parameters.Add("3", row.Cantidad);
                parameters.Add("4", row.Toneladas);
                parameters.Add("5", uid);
                parameters.Add("6", row.IuaeId);
                parameters.Add("7", row.ReliId);
            },
            cancellationToken);

    public Task<int> UpdateResumenEmpresaAsync(IReadOnlyList<UpdateResumenEmpresaRequestDto> items, long userId, CancellationToken cancellationToken)
        => ExecuteBatchUpdateAsync(
            @"UPDATE RELI_INFOEMPRDIVI
                 SET CBLJ = :1,
                     COSTO = :2,
                     TARIFA = :3,
                     USUA_USUA = :4,
                     FECHA = SYSDATE
               WHERE INED_ID = :5
                 AND RELI_ID = :6",
            items,
            userId,
            (parameters, row, uid) =>
            {
                parameters.Add("1", row.Cblj);
                parameters.Add("2", row.Costo);
                parameters.Add("3", row.Tarifa);
                parameters.Add("4", uid);
                parameters.Add("5", row.InedId);
                parameters.Add("6", row.ReliId);
            },
            cancellationToken);

    public Task<int> UpdateResumenApsAsync(IReadOnlyList<UpdateResumenApsRequestDto> items, long userId, CancellationToken cancellationToken)
        => ExecuteBatchUpdateAsync(
            @"UPDATE RELI_INFOAPSEMPRDIVI
                 SET QRTZ = :1,
                     COSTO = :2,
                     TARIFA = :3,
                     USUA_USUA = :4,
                     FECHA = SYSDATE
               WHERE IAED_ID = :5
                 AND RELI_ID = :6",
            items,
            userId,
            (parameters, row, uid) =>
            {
                parameters.Add("1", row.Qrtz);
                parameters.Add("2", row.Costo);
                parameters.Add("3", row.Tarifa);
                parameters.Add("4", uid);
                parameters.Add("5", row.IaedId);
                parameters.Add("6", row.ReliId);
            },
            cancellationToken);

    public Task<int> UpdateResumenRellenoAsync(IReadOnlyList<UpdateResumenRellenoRequestDto> items, long userId, CancellationToken cancellationToken)
        => ExecuteBatchUpdateAsync(
            @"UPDATE RELI_INFOAPSRELLENO
                 SET QRS = :1,
                     COSTO = :2,
                     TARIFA = :3,
                     USUA_USUA = :4,
                     FECHA = SYSDATE
               WHERE IARE_ID = :5
                 AND RELI_ID = :6",
            items,
            userId,
            (parameters, row, uid) =>
            {
                parameters.Add("1", row.Qrs);
                parameters.Add("2", row.Costo);
                parameters.Add("3", row.Tarifa);
                parameters.Add("4", uid);
                parameters.Add("5", row.IareId);
                parameters.Add("6", row.ReliId);
            },
            cancellationToken);

    public Task<int> UpdateResumenAdicionalAsync(IReadOnlyList<UpdateResumenAdicionalRequestDto> items, long userId, CancellationToken cancellationToken)
        => ExecuteBatchUpdateAsync(
            @"UPDATE RELI_INFOADICIONAL
                 SET CDF = :1,
                     CTL = :2,
                     USUA_USUA = :3,
                     FECHA = SYSDATE
               WHERE CEAD_ID = :4
                 AND RELI_ID = :5",
            items,
            userId,
            (parameters, row, uid) =>
            {
                parameters.Add("1", row.Cdf);
                parameters.Add("2", row.Ctl);
                parameters.Add("3", uid);
                parameters.Add("4", row.CeadId);
                parameters.Add("5", row.ReliId);
            },
            cancellationToken);

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
        public string JsonTrna { get; set; } = string.Empty;
    }

    private async Task<int> ExecuteBatchUpdateAsync<T>(
        string sql,
        IReadOnlyList<T> items,
        long userId,
        Action<DynamicParameters, T, long> map,
        CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            var affected = 0;
            foreach (var item in items)
            {
                var parameters = new DynamicParameters();
                map(parameters, item, userId);
                affected += await connection.ExecuteAsync(new CommandDefinition(sql, parameters, transaction, cancellationToken: cancellationToken));
            }

            transaction.Commit();
            return affected;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }
}
