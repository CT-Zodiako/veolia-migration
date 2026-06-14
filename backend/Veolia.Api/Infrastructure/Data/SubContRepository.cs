using System.Data;
using Dapper;
using Oracle.ManagedDataAccess.Client;
using Veolia.Api.Contracts.SubCont;

namespace Veolia.Api.Infrastructure.Data;

public sealed class SubContRepository(IOracleConnectionFactory connectionFactory) : ISubContRepository
{
    public async Task<List<SubContItemResponse>> ConsultarAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT SUCO_ID AS SucoId,
                   APSA_ID AS ApsaId,
                   EMPR_EMPR AS EmprEmpr,
                   DIVI_DIVI AS DiviDivi,
                   CLAS_CLASE AS ClasClase,
                   SUCO_ANNO AS SucoAnno,
                   SUCO_MES AS SucoMes,
                   PARA_TIPPRED20016 AS ParaTippred20016,
                   SUCO_VALOR AS SucoValor,
                   SUCO_ESTADO AS SucoEstado,
                   SUCO_FECHACREACION AS SucoFechacreacion,
                   USUA_USUA AS UsuaUsua
            FROM AUCO_APSSUBSCONT
            WHERE APSA_ID = :aps AND SUCO_ANNO = :anno AND SUCO_MES = :mes AND SUCO_ESTADO = 1";

        using var connection = connectionFactory.CreateConnection();
        await ((System.Data.Common.DbConnection)connection).OpenAsync(cancellationToken);
        var result = await connection.QueryAsync<SubContItemResponse>(
            new CommandDefinition(sql, new { aps, anno, mes }, cancellationToken: cancellationToken));
        return result.ToList();
    }

    public async Task<SubContResponse> CrearAsync(int aps, int anno, int mes, List<SubContValorItem> valores, long usuarioId, CancellationToken cancellationToken)
    {
        using var connection = connectionFactory.CreateConnection();
        await ((System.Data.Common.DbConnection)connection).OpenAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            // Lookup de APS-Empresa-División
            const string lookupSql = @"
                SELECT APSA_ID, EMPR_EMPR, DIVI_DIVI
                FROM AUCO_APSEMPRDIVI
                WHERE APSA_ID = :aps AND APEM_ESTADO = 1";

            var lookups = await connection.QueryAsync<( int ApsaId, int EmprEmpr, int DiviDivi )>(
                new CommandDefinition(lookupSql, new { aps }, transaction, cancellationToken: cancellationToken));

            var lookup = lookups.FirstOrDefault();
            if (lookup == default)
            {
                return new SubContResponse(false, "No se encontró configuración APS-Empresa-División activa.");
            }

            const string insertSql = @"
                INSERT INTO AUCO_APSSUBSCONT
                (SUCO_ID, APSA_ID, EMPR_EMPR, DIVI_DIVI, CLAS_CLASE, SUCO_ANNO, SUCO_MES,
                 PARA_TIPPRED20016, SUCO_VALOR, SUCO_ESTADO, SUCO_FECHACREACION, USUA_USUA)
                VALUES (SAUCO_APSSUBSCONT.NEXTVAL, :apsaId, :emprEmpr, :diviDivi, :clasClase,
                        :sucoAnno, :sucoMes, :paraTippred, :sucoValor, 1, CURRENT_DATE, :usuaUsua)";

            foreach (var valor in valores)
            {
                var parameters = new DynamicParameters();
                parameters.Add("apsaId", lookup.ApsaId);
                parameters.Add("emprEmpr", lookup.EmprEmpr);
                parameters.Add("diviDivi", lookup.DiviDivi);
                parameters.Add("clasClase", valor.Id);
                parameters.Add("sucoAnno", anno);
                parameters.Add("sucoMes", mes);
                parameters.Add("paraTippred", 2); // Valor fijo según AS-IS
                parameters.Add("sucoValor", valor.Val);
                parameters.Add("usuaUsua", usuarioId);

                await connection.ExecuteAsync(
                    new CommandDefinition(insertSql, parameters, transaction, cancellationToken: cancellationToken));
            }

            transaction.Commit();
            return new SubContResponse(true, null);
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            return new SubContResponse(false, $"Error al crear: {ex.Message}");
        }
    }

    public async Task<SubContResponse> EditarAsync(int aps, int anno, int mes, List<SubContValorItem> valores, CancellationToken cancellationToken)
    {
        using var connection = connectionFactory.CreateConnection();
        await ((System.Data.Common.DbConnection)connection).OpenAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            // CORRECCIÓN del bug AS-IS: suco_anno comparaba contra :2 (aps) en vez de anno
            const string updateSql = @"
                UPDATE AUCO_APSSUBSCONT
                SET SUCO_VALOR = :sucoValor
                WHERE APSA_ID = :aps
                  AND SUCO_ANNO = :anno
                  AND SUCO_MES = :mes
                  AND CLAS_CLASE = :clasClase
                  AND SUCO_ESTADO = 1";

            foreach (var valor in valores)
            {
                var parameters = new DynamicParameters();
                parameters.Add("sucoValor", valor.Val);
                parameters.Add("aps", aps);
                parameters.Add("anno", anno);
                parameters.Add("mes", mes);
                parameters.Add("clasClase", valor.Id);

                await connection.ExecuteAsync(
                    new CommandDefinition(updateSql, parameters, transaction, cancellationToken: cancellationToken));
            }

            transaction.Commit();
            return new SubContResponse(true, null);
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            return new SubContResponse(false, $"Error al editar: {ex.Message}");
        }
    }

    public async Task<List<SubContApsResponse>> ListarApsAsync(CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT APSA_ID AS ApsaId, APSA_NOMAPS AS ApsaNombre
            FROM AUCO_APSASEO
            WHERE APSA_ESTADO = 1
            ORDER BY APSA_NOMAPS";

        using var connection = connectionFactory.CreateConnection();
        await ((System.Data.Common.DbConnection)connection).OpenAsync(cancellationToken);
        var result = await connection.QueryAsync<SubContApsResponse>(
            new CommandDefinition(sql, cancellationToken: cancellationToken));
        return result.ToList();
    }

    public async Task<SubContResponse> EliminarAsync(long id, CancellationToken cancellationToken)
    {
        // CORRECCIÓN del bug AS-IS: tabla objetivo era auco_apsaseo (incorrecta)
        const string sql = @"
            UPDATE AUCO_APSSUBSCONT
            SET SUCO_ESTADO = 0
            WHERE SUCO_ID = :id";

        using var connection = connectionFactory.CreateConnection();
        await ((System.Data.Common.DbConnection)connection).OpenAsync(cancellationToken);
        var rows = await connection.ExecuteAsync(
            new CommandDefinition(sql, new { id }, cancellationToken: cancellationToken));

        if (rows == 0)
        {
            return new SubContResponse(false, "No se encontró el registro.");
        }

        return new SubContResponse(true, null);
    }
}
