namespace Veolia.Api.Modules.Regulator.Aps;

public sealed class ApsContractMapper
{
    public object MapMutationResponse(object? payload)
    {
        return payload ?? new { rowsAffected = 0 };
    }
}
