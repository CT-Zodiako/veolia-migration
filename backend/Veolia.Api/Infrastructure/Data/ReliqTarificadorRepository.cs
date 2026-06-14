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

    public async Task<string?> AprobarReliquidacionAsync(long reliqId, long usuarioId, CancellationToken cancellationToken)
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
        return parameters.Get<string>("1");
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
        return await connection.QueryFirstOrDefaultAsync<string>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
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
