using System.Data;
using System.Data.Common;
using Dapper;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Sui853.Configuracion;

public interface IFormulariosRepository
{
    Task<IReadOnlyList<FormularioRow>> ListAsync(CancellationToken cancellationToken);
    Task<FormularioRow?> UpdateAsync(FormularioRow row, CancellationToken cancellationToken);
}

public sealed class FormulariosRepository(IOracleConnectionFactory connectionFactory) : IFormulariosRepository
{
    private const string SelectSql = """
        SELECT FORMATO, SECCION, FIELD, HEADER_TXT, BACKGROUND_COLOR, FILTER_FLAG,
               FORMATO_DATO, DECIMALES, ALINEACION, TOOLTIP, MOSTRAR_HEADER,
               INCLUIR_DATA, ORDEN_HEADER, ORDEN_DATA FROM SUI.CFG_COLUMNA
        """;
    private const string IdentitySql = " WHERE FORMATO = :FORMATO AND SECCION = :SECCION AND FIELD = :FIELD";

    public async Task<IReadOnlyList<FormularioRow>> ListAsync(CancellationToken cancellationToken)
    {
        using var connection = connectionFactory.CreateConnection();
        await OpenAsync(connection, cancellationToken);
        return (await connection.QueryAsync<FormularioRow>(new CommandDefinition(
            SelectSql + " ORDER BY FORMATO, SECCION, ORDEN_HEADER, FIELD", cancellationToken: cancellationToken))).ToList();
    }

    public async Task<FormularioRow?> UpdateAsync(FormularioRow row, CancellationToken cancellationToken)
    {
        using var connection = connectionFactory.CreateConnection();
        await OpenAsync(connection, cancellationToken);
        using var transaction = connection.BeginTransaction();
        // Parameter insertion order also matches the SQL for providers binding by position.
        var values = new DynamicParameters();
        values.Add("HEADER_TXT", row.HEADER_TXT);
        values.Add("BACKGROUND_COLOR", row.BACKGROUND_COLOR);
        values.Add("FILTER_FLAG", row.FILTER_FLAG);
        values.Add("FORMATO_DATO", row.FORMATO_DATO);
        values.Add("DECIMALES", row.DECIMALES, DbType.Int32);
        values.Add("ALINEACION", row.ALINEACION);
        values.Add("TOOLTIP", row.TOOLTIP, DbType.String);
        values.Add("MOSTRAR_HEADER", row.MOSTRAR_HEADER);
        values.Add("INCLUIR_DATA", row.INCLUIR_DATA);
        values.Add("ORDEN_HEADER", row.ORDEN_HEADER, DbType.Int32);
        values.Add("ORDEN_DATA", row.ORDEN_DATA, DbType.Int32);
        values.Add("FORMATO", row.FORMATO);
        values.Add("SECCION", row.SECCION);
        values.Add("FIELD", row.FIELD);
        const string update = """
            UPDATE SUI.CFG_COLUMNA SET HEADER_TXT = :HEADER_TXT,
                BACKGROUND_COLOR = :BACKGROUND_COLOR, FILTER_FLAG = :FILTER_FLAG,
                FORMATO_DATO = :FORMATO_DATO, DECIMALES = :DECIMALES,
                ALINEACION = :ALINEACION, TOOLTIP = :TOOLTIP,
                MOSTRAR_HEADER = :MOSTRAR_HEADER, INCLUIR_DATA = :INCLUIR_DATA,
                ORDEN_HEADER = :ORDEN_HEADER, ORDEN_DATA = :ORDEN_DATA
            """;
        var count = await connection.ExecuteAsync(new CommandDefinition(update + IdentitySql, values,
            transaction, cancellationToken: cancellationToken));
        if (count == 0) return null; // Disposal rolls back the transaction.
        if (count != 1) throw new InvalidOperationException("Non-unique configuration identity.");
        var identity = new DynamicParameters();
        identity.Add("FORMATO", row.FORMATO);
        identity.Add("SECCION", row.SECCION);
        identity.Add("FIELD", row.FIELD);
        var saved = await connection.QuerySingleAsync<FormularioRow>(new CommandDefinition(
            SelectSql + IdentitySql, identity, transaction, cancellationToken: cancellationToken));
        transaction.Commit();
        return saved;
    }

    private static async Task OpenAsync(IDbConnection connection, CancellationToken cancellationToken)
    {
        if (connection is DbConnection db) await db.OpenAsync(cancellationToken);
        else connection.Open();
    }
}
