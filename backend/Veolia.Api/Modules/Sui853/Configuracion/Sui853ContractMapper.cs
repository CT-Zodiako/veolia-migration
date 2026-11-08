namespace Veolia.Api.Modules.Sui853.Configuracion;

public sealed class Sui853ContractMapper
{
    public object MapOk(object data) => new
    {
        status = StatusCodes.Status200OK,
        data
    };
}
