namespace Veolia.Api.Modules.Regulator.Aps;

public sealed class ApsContractMapper
{
    public object MapLegacyError(Exception ex)
    {
        var oracleEx = ex as Oracle.ManagedDataAccess.Client.OracleException;
        return new
        {
            data = "Error",
            message = ex.Message,
            oraCode = oracleEx is not null ? $"ORA-{Math.Abs(oracleEx.Number):D5}" : null
        };
    }

    public object MapMutationResponse(object? payload)
    {
        return payload ?? new { rowsAffected = 0 };
    }
}
