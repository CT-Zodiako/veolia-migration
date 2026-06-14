namespace Veolia.Api.Infrastructure.Aps;

public sealed class ApsContractMapper
{
    public object MapLegacyError() => new { data = "Error" };

    public object MapMutationResponse(object? payload)
    {
        return payload ?? new { rowsAffected = 0 };
    }
}
