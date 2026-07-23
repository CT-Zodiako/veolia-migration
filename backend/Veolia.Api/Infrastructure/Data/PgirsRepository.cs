using System.Data;
using Dapper;
using Veolia.Api.Contracts.Pgirs;

namespace Veolia.Api.Infrastructure.Data
{
    public interface IPgirsRepository
    {
        Task<IEnumerable<dynamic>> GetResumenAsync(long apsId);
        Task<IEnumerable<dynamic>> GetInformeVariablesAsync(long apsId);
        Task<IEnumerable<dynamic>> GetBarridoAsync(long apsId);
        Task<IEnumerable<dynamic>> GetVariablesAsync(long apsId, int anno, int mes);
        Task<bool> EditarVariablesAsync(List<EditarVariableDto> variables, long usuarioId);
        Task<bool> NuevoVariablesAsync(NuevoVariablesRequestDto data, long usuarioId);
    }

    public class PgirsRepository : IPgirsRepository
    {
        private readonly IOracleConnectionFactory _connectionFactory;

        public PgirsRepository(IOracleConnectionFactory connectionFactory)
        {
            _connectionFactory = connectionFactory;
        }

        public async Task<IEnumerable<dynamic>> GetResumenAsync(long apsId)
        {
            const string sql = "SELECT * FROM vgirs_informe WHERE apsid = :apsId";
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync(sql, new { apsId });
        }

        public async Task<IEnumerable<dynamic>> GetInformeVariablesAsync(long apsId)
        {
            const string sql = "SELECT * FROM vpgir_infvariables WHERE APSAID = :apsId ORDER BY apsa_nomaps, periodo DESC";
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync(sql, new { apsId });
        }

        public async Task<IEnumerable<dynamic>> GetBarridoAsync(long apsId)
        {
            const string sql = "SELECT * FROM VGIRS_INFORMELBL WHERE apsid = :apsId";
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync(sql, new { apsId });
        }

        public async Task<IEnumerable<dynamic>> GetVariablesAsync(long apsId, int anno, int mes)
        {
            const string sql = "SELECT * FROM vpirg_parametros WHERE APSAID = :apsId AND PGRIANNO = :anno AND PGRIMES = :mes";
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync(sql, new { apsId, anno, mes });
        }

        public async Task<bool> EditarVariablesAsync(List<EditarVariableDto> variables, long usuarioId)
        {
            const string sql = @"
                UPDATE PGRI_PARAMETROS
                SET PGRIVALOR = :valor,
                    PGRIFRECUENCIA = :frecuencia,
                    PGRIFECHA = SYSDATE,
                    PGRIUSUARIO = :usuarioId,
                    pgringreso = 'MANUAL'
                WHERE APSAID = :apsId
                  AND PGRIANNO = :anno
                  AND PGRIMES = :mes
                  AND PGRIVARIABLE = :codVariable";

            using var connection = _connectionFactory.CreateConnection();
            using var transaction = connection.BeginTransaction();

            try
            {
                var totalAffected = 0;
                foreach (var variable in variables)
                {
                    var parameters = new DynamicParameters();
                    parameters.Add("valor", variable.Valor);
                    parameters.Add("frecuencia", variable.Frecuencia);
                    parameters.Add("usuarioId", usuarioId);
                    parameters.Add("apsId", variable.ApsId);
                    parameters.Add("anno", variable.Anno);
                    parameters.Add("mes", variable.Mes);
                    parameters.Add("codVariable", variable.CodVariable);

                    totalAffected += await connection.ExecuteAsync(sql, parameters, transaction);
                }

                transaction.Commit();
                return totalAffected > 0;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }

        public async Task<bool> NuevoVariablesAsync(NuevoVariablesRequestDto data, long usuarioId)
        {
            const string sql = @"
                INSERT INTO PGRI_PARAMETROS
                  (APSAID, PGRIANNO, PGRIMES, PGRIVARIABLE, PGRIVALOR, PGRIFRECUENCIA, PGRIFECHA, PGRIUSUARIO)
                VALUES
                  (:apsId, :anno, :mes, :codVariable, :valor, :frecuencia, SYSDATE, :usuarioId)";

            var variables = new List<VariablePgiros>
            {
                new VariablePgiros { CodVariable = 11, Valor = data.Lbl, Frecuencia = data.LblFrecuencia },
                new VariablePgiros { CodVariable = 21, Valor = data.Cesped, Frecuencia = data.CespedFrecuencia },
                new VariablePgiros { CodVariable = 22, Valor = data.Poda, Frecuencia = data.PodaFrecuencia },
                new VariablePgiros { CodVariable = 23, Valor = data.Lavado, Frecuencia = data.LavadoFrecuencia },
                new VariablePgiros { CodVariable = 24, Valor = data.Playas, Frecuencia = data.PlayasFrecuencia },
                new VariablePgiros { CodVariable = 25, Valor = data.Inscestas, Frecuencia = data.InscestasFrecuencia },
                new VariablePgiros { CodVariable = 26, Valor = data.Mancestas, Frecuencia = data.MancestasFrecuencia }
            };

            using var connection = _connectionFactory.CreateConnection();
            using var transaction = connection.BeginTransaction();

            try
            {
                var totalAffected = 0;
                foreach (var variable in variables)
                {
                    var codVariable = variable.CodVariable;
                    var valor = variable.Valor;
                    var frecuencia = variable.Frecuencia;
                    if (!valor.HasValue) continue;

                    var parameters = new DynamicParameters();
                    parameters.Add("apsId", data.ApsId);
                    parameters.Add("anno", data.Anno);
                    parameters.Add("mes", data.Mes);
                    parameters.Add("codVariable", codVariable);
                    parameters.Add("valor", valor.Value);
                    parameters.Add("frecuencia", frecuencia);
                    parameters.Add("usuarioId", usuarioId);

                    totalAffected += await connection.ExecuteAsync(sql, parameters, transaction);
                }

                transaction.Commit();
                return totalAffected > 0;
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }
    }

    public class VariablePgiros
    {
        public int CodVariable { get; set; }
        public decimal? Valor { get; set; }
        public string? Frecuencia { get; set; }
    }
}
