using Oracle.ManagedDataAccess.Client;

namespace Veolia.Api.Infrastructure.Data;

public class OracleConnectionFactory(IConfiguration configuration) : IOracleConnectionFactory
{
    private const string ConnectionStringKey = "ConnectionStrings:Oracle";

    public System.Data.IDbConnection CreateConnection()
    {
        var connectionString = configuration[ConnectionStringKey];

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "Oracle connection string is missing. Configure ConnectionStrings__Oracle in environment variables.");
        }

        // App schema routing without DDL: when connected as a non-owner user
        // (e.g. ADMIN on veolia_high), unqualified objects (AUGE_*, AUCO_*,
        // json_json, VAUCO_*, PL/SQL packages) must resolve to the TARIFICADOR
        // schema. When connected AS TARIFICADOR (veom_high) this is a no-op.
        // Runs right after Open() via StateChange so no repository changes are
        // needed. RELIQ.-qualified queries are unaffected (schema-explicit).
        var connection = new OracleConnection(connectionString);
        connection.StateChange += (_, args) =>
        {
            if (args.CurrentState == System.Data.ConnectionState.Open)
            {
                using var command = connection.CreateCommand();
                command.CommandText = "ALTER SESSION SET CURRENT_SCHEMA = TARIFICADOR";
                command.ExecuteNonQuery();
            }
        };

        return connection;
    }
}
