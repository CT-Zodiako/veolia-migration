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
            const string sql = "SELECT * FROM vgirs_informe WHERE apsid = :1";
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync(sql, new { p1 = apsId });
        }

        public async Task<IEnumerable<dynamic>> GetInformeVariablesAsync(long apsId)
        {
            const string sql = "SELECT * FROM vpgir_infvariables WHERE APSAID = :1 ORDER BY apsa_nomaps, periodo DESC";
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync(sql, new { p1 = apsId });
        }

        public async Task<IEnumerable<dynamic>> GetBarridoAsync(long apsId)
        {
            const string sql = "SELECT * FROM VGIRS_INFORMELBL WHERE apsid = :1";
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync(sql, new { p1 = apsId });
        }

        public async Task<IEnumerable<dynamic>> GetVariablesAsync(long apsId, int anno, int mes)
        {
            const string sql = "SELECT * FROM vpirg_parametros WHERE APSAID = :1 AND PGRIANNO = :2 AND PGRIMES = :3";
            using var connection = _connectionFactory.CreateConnection();
            return await connection.QueryAsync(sql, new { p1 = apsId, p2 = anno, p3 = mes });
        }

        public async Task<bool> EditarVariablesAsync(List<EditarVariableDto> variables, long usuarioId)
        {
            const string sql = @"
                UPDATE PGRI_PARAMETROS
                SET PGRIVALOR = :1,
                    PGRIFRECUENCIA = :2,
                    PGRIFECHA = SYSDATE,
                    PGRIUSUARIO = :3,
                    pgringreso = 'MANUAL'
                WHERE APSAID = :4
                  AND PGRIANNO = :5
                  AND PGRIMES = :6
                  AND PGRIVARIABLE = :7";

            using var connection = _connectionFactory.CreateConnection();
            using var transaction = connection.BeginTransaction();

            try
            {
                foreach (var variable in variables)
                {
                    var parameters = new DynamicParameters();
                    parameters.Add("p1", variable.Valor);
                    parameters.Add("p2", variable.Frecuencia);
                    parameters.Add("p3", usuarioId);
                    parameters.Add("p4", variable.ApsId);
                    parameters.Add("p5", variable.Anno);
                    parameters.Add("p6", variable.Mes);
                    parameters.Add("p7", variable.CodVariable);

                    await connection.ExecuteAsync(sql, parameters, transaction);
                }

                transaction.Commit();
                return true;
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
                  (:1, :2, :3, :4, :5, :6, SYSDATE, :7)";

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
                foreach (var variable in variables)
                {
                    var codVariable = variable.CodVariable;
                    var valor = variable.Valor;
                    var frecuencia = variable.Frecuencia;
                    if (!valor.HasValue) continue;

                    var parameters = new DynamicParameters();
                    parameters.Add("p1", data.ApsId);
                    parameters.Add("p2", data.Anno);
                    parameters.Add("p3", data.Mes);
                    parameters.Add("p4", codVariable);
                    parameters.Add("p5", valor.Value);
                    parameters.Add("p6", frecuencia);
                    parameters.Add("p7", usuarioId);

                    await connection.ExecuteAsync(sql, parameters, transaction);
                }

                transaction.Commit();
                return true;
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
