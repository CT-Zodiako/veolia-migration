    using System.Data;
    using Dapper;
    using Oracle.ManagedDataAccess.Client;
    using Veolia.Api.Infrastructure.Data;
    
    namespace Veolia.Api.Modules.Regulator.SubCont;

    public sealed class SubContRepository(IOracleConnectionFactory connectionFactory) : ISubContRepository
    {
        public async Task<List<SubContItemResponse>> ConsultarAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        {
            // Legacy subcont/controller.js:26-33: SELECT * without an estado filter.
            const string sql = @"
                SELECT *
                FROM AUCO_APSSUBSCONT
                WHERE APSA_ID = :aps AND SUCO_ANNO = :anno AND SUCO_MES = :mes";

            using var connection = connectionFactory.CreateConnection();
            await ((System.Data.Common.DbConnection)connection).OpenAsync(cancellationToken);
            var rows = await connection.QueryAsync(
                new CommandDefinition(sql, new { aps, anno, mes }, cancellationToken: cancellationToken));
            return rows.Cast<IDictionary<string, object?>>().Select(MapItem).ToList();
        }

        private static SubContItemResponse MapItem(IDictionary<string, object?> row)
        {
            var columns = new Dictionary<string, object?>(row, StringComparer.OrdinalIgnoreCase);
            object? Read(string column) => columns.TryGetValue(column, out var value) && value is not DBNull ? value : null;
            long ReadLong(string column) => Read(column) is { } value ? Convert.ToInt64(value) : 0;
            int ReadInt(string column) => Read(column) is { } value ? Convert.ToInt32(value) : 0;

            return new SubContItemResponse
            {
                SucoId = ReadLong("SUCO_ID"),
                ApsaId = ReadInt("APSA_ID"),
                EmprEmpr = ReadInt("EMPR_EMPR"),
                DiviDivi = ReadInt("DIVI_DIVI"),
                ClasClase = ReadInt("CLAS_CLASE"),
                SucoAnno = ReadInt("SUCO_ANNO"),
                SucoMes = ReadInt("SUCO_MES"),
                ParaTippred20016 = ReadInt("PARA_TIPPRED20016"),
                SucoValor = Read("SUCO_VALOR") is { } valor ? Convert.ToDecimal(valor) : null,
                SucoEstado = ReadInt("SUCO_ESTADO"),
                SucoFechacreacion = Read("SUCO_FECHACREACION") is { } fecha ? Convert.ToDateTime(fecha) : default,
                UsuaUsua = ReadInt("USUA_USUA")
            };
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
                      AND CLAS_CLASE = :clasClase";

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
