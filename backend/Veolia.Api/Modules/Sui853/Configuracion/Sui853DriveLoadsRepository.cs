using System.Data;
using System.Data.Common;
using Dapper;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Sui853.Configuracion;

public interface ISui853DriveLoadsRepository
{
    /// <summary>APS name from SUI.TCFG_APS and its distinct companies from SUI.VCFGAPSEMPRESA; null when the APS does not exist.</summary>
    Task<Sui853ApsInfo?> FindApsAsync(long apsId, CancellationToken ct);

    /// <summary>In one transaction: delete exactly <paramref name="periods"/> from the target table, then insert
    /// <paramref name="rows"/>. Any failure rolls everything back.</summary>
    Task<DriveLoadOutcome> ReplaceAsync(DriveLoadTarget target, IReadOnlyList<DriveLoadPeriod> periods,
        IReadOnlyList<object?[]> rows, CancellationToken ct);
}

public sealed class Sui853DriveLoadsRepository(IOracleConnectionFactory factory) : ISui853DriveLoadsRepository
{
    public async Task<Sui853ApsInfo?> FindApsAsync(long apsId, CancellationToken ct)
    {
        using var db = factory.CreateConnection();
        await OpenAsync(db, ct);
        var names = (await db.QueryAsync<string>(new CommandDefinition(
            "SELECT NOMBRE_APS FROM SUI.TCFG_APS WHERE TCFG_APS_ID = :apsId", new { apsId }, cancellationToken: ct))).ToList();
        if (names.Count == 0) return null;
        var companies = (await db.QueryAsync<string>(new CommandDefinition(
            "SELECT DISTINCT EMPRESA FROM SUI.VCFGAPSEMPRESA WHERE TCFG_APS_ID = :apsId AND EMPRESA IS NOT NULL ORDER BY EMPRESA",
            new { apsId }, cancellationToken: ct))).ToList();
        return new Sui853ApsInfo(apsId, names[0], companies);
    }

    public async Task<DriveLoadOutcome> ReplaceAsync(DriveLoadTarget target, IReadOnlyList<DriveLoadPeriod> periods,
        IReadOnlyList<object?[]> rows, CancellationToken ct)
    {
        if (rows.Any(r => r.Length != target.Columns.Count)) throw new ArgumentException("Carga inválida.");
        var deleteSql = $"DELETE FROM SUI.{target.Table} WHERE APS = :aps AND ANNO = :anno AND MES = :mes";
        var columns = target.Columns.Concat(target.Constants.Select(c => c.Column));
        var values = target.Columns.Select((_, i) => $":p{i}").Concat(target.Constants.Select(c => c.Expression));
        var insertSql = $"INSERT INTO SUI.{target.Table} ({string.Join(", ", columns)}) VALUES ({string.Join(", ", values)})";

        using var db = factory.CreateConnection();
        await OpenAsync(db, ct);
        using var transaction = db.BeginTransaction();
        var deleted = 0;
        foreach (var period in periods)
        {
            deleted += await db.ExecuteAsync(new CommandDefinition(deleteSql,
                new { aps = period.Aps, anno = period.Anno, mes = period.Mes }, transaction, cancellationToken: ct));
        }

        var inserted = 0;
        for (var i = 0; i < rows.Count; i++)
        {
            ct.ThrowIfCancellationRequested();
            var parameters = new DynamicParameters();
            for (var c = 0; c < rows[i].Length; c++) parameters.Add($"p{c}", rows[i][c]);
            try
            {
                inserted += await db.ExecuteAsync(new CommandDefinition(insertSql, parameters, transaction, cancellationToken: ct));
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                throw new DriveLoadRowException(i, ex);
            }
        }
        ct.ThrowIfCancellationRequested();
        transaction.Commit(); // Not reached on failure: disposing the transaction rolls back deletes and inserts.
        return new DriveLoadOutcome(deleted, inserted);
    }

    private static async Task OpenAsync(IDbConnection db, CancellationToken ct)
    {
        if (db is DbConnection connection) await connection.OpenAsync(ct);
        else db.Open();
    }
}
