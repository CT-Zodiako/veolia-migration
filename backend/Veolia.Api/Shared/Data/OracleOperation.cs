using Oracle.ManagedDataAccess.Client;
using Veolia.Api.Exceptions;

namespace Veolia.Api.Infrastructure.Data;

public static class OracleOperation
{
    // Runs an Oracle call and, if it fails, rethrows it as OracleOperationException carrying the
    // operation name and its parameters. ORA-03135 (lost connection) is left to the caller, which
    // already maps it to OracleTimeoutException.
    public static async Task<T> RunAsync<T>(string operation, object parameters, Func<Task<T>> action)
    {
        try
        {
            return await action();
        }
        catch (OracleException ex) when (ex.Number != 3135)
        {
            throw new OracleOperationException(operation, ToDictionary(parameters), ex.Number, ex.Message, ex);
        }
    }

    private static IReadOnlyDictionary<string, object?> ToDictionary(object parameters) =>
        parameters.GetType().GetProperties().ToDictionary(p => p.Name, p => p.GetValue(parameters));
}
