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

        return new OracleConnection(connectionString);
    }
}
