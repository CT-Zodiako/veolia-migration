using System.Data;
using System.Data.Common;
using Dapper;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Sui853.Configuracion;

public interface ICargaGenericaRepository
{
    Task<IReadOnlyList<string>> TablesAsync(CancellationToken ct);
    Task<IReadOnlyList<CargaColumn>> ColumnsAsync(string table, CancellationToken ct);
    Task<int> InsertAsync(string table, IReadOnlyList<CargaColumn> columns, IReadOnlyList<object?[]> rows, CancellationToken ct);
    Task TruncateAsync(string table, CancellationToken ct);
}

public sealed class CargaGenericaRepository(IOracleConnectionFactory factory) : ICargaGenericaRepository
{
    public async Task<IReadOnlyList<string>> TablesAsync(CancellationToken ct)
    {
        using var db = factory.CreateConnection();
        await OpenAsync(db, ct);
        return (await db.QueryAsync<string>(new CommandDefinition(
            "SELECT TABLE_NAME FROM ALL_TABLES WHERE OWNER = 'SUI' ORDER BY TABLE_NAME", cancellationToken: ct))).ToList();
    }

    public async Task<IReadOnlyList<CargaColumn>> ColumnsAsync(string table, CancellationToken ct)
    {
        table = CargaGenericaValidation.Identifier(table);
        using var db = factory.CreateConnection();
        await OpenAsync(db, ct);
        return await ColumnsAsync(db, table, ct);
    }

    private static async Task<IReadOnlyList<CargaColumn>> ColumnsAsync(IDbConnection db, string table, CancellationToken ct)
    {
        const string sql = """
            SELECT COLUMN_NAME, DATA_TYPE, COLUMN_ID FROM ALL_TAB_COLUMNS c
            WHERE OWNER = 'SUI' AND TABLE_NAME = :tableName
              AND EXISTS (SELECT 1 FROM ALL_TABLES t WHERE t.OWNER = c.OWNER AND t.TABLE_NAME = c.TABLE_NAME)
            ORDER BY COLUMN_ID
            """;
        var rows = await db.QueryAsync(new CommandDefinition(sql, new { tableName = table }, cancellationToken: ct));
        var columns = rows.Select(r => new CargaColumn((string)r.COLUMN_NAME, (string)r.DATA_TYPE, Convert.ToInt32(r.COLUMN_ID))).ToList();
        if (columns.Count == 0) throw new ArgumentException("No se encontró la tabla SUI.");
        return columns;
    }

    public async Task<int> InsertAsync(string table, IReadOnlyList<CargaColumn> columns, IReadOnlyList<object?[]> rows, CancellationToken ct)
    {
        table = CargaGenericaValidation.Identifier(table);
        var names = columns.Select(c => CargaGenericaValidation.Identifier(c.COLUMN_NAME)).ToArray();
        if (names.Length == 0 || names.Distinct().Count() != names.Length || rows.Any(r => r.Length != names.Length))
            throw new ArgumentException("Carga inválida.");
        using var db = factory.CreateConnection();
        await OpenAsync(db, ct);
        var actual = await ColumnsAsync(db, table, ct);
        if (names.Except(actual.Select(c => c.COLUMN_NAME)).Any()) throw new ArgumentException("Columnas de destino inválidas.");
        using var transaction = db.BeginTransaction();
        var sql = $"INSERT INTO SUI.{table} ({string.Join(", ", names)}) VALUES ({string.Join(", ", names.Select((_, i) => $":p{i}"))})";
        var inserted = 0;
        foreach (var row in rows)
        {
            ct.ThrowIfCancellationRequested();
            var parameters = new DynamicParameters();
            for (var i = 0; i < row.Length; i++) parameters.Add($"p{i}", row[i]);
            inserted += await db.ExecuteAsync(new CommandDefinition(sql, parameters, transaction, cancellationToken: ct));
        }
        ct.ThrowIfCancellationRequested();
        transaction.Commit(); // Any preceding failure disposes/rolls back the entire load.
        return inserted;
    }

    public async Task TruncateAsync(string table, CancellationToken ct)
    {
        table = CargaGenericaValidation.Identifier(table);
        using var db = factory.CreateConnection();
        await OpenAsync(db, ct);
        await ColumnsAsync(db, table, ct);
        // Oracle DDL commits implicitly: this is deliberately never called by InsertAsync.
        await db.ExecuteAsync(new CommandDefinition($"TRUNCATE TABLE SUI.{table}", cancellationToken: ct));
    }

    private static async Task OpenAsync(IDbConnection db, CancellationToken ct)
    {
        if (db is DbConnection connection) await connection.OpenAsync(ct);
        else db.Open();
    }
}
