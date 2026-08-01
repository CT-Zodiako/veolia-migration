using System.Data;

namespace Veolia.Api.Infrastructure.Data;

public interface IOracleConnectionFactory
{
    IDbConnection CreateConnection();
}
