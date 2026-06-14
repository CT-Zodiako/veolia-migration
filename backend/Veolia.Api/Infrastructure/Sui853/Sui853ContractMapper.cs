namespace Veolia.Api.Infrastructure.Sui853;

public sealed class Sui853ContractMapper
{
    public object MapOk(object data) => new
    {
        status = StatusCodes.Status200OK,
        data
    };

    public object MapError(string error = "Error") => new
    {
        status = StatusCodes.Status500InternalServerError,
        data = error
    };
}
