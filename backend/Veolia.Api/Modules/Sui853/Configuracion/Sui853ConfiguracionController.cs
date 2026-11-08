using Microsoft.AspNetCore.Mvc;

namespace Veolia.Api.Modules.Sui853.Configuracion;

[ApiController]
[Route("api/v1/sui853Configuracion")]
public sealed class Sui853ConfiguracionController(
    ISui853ReadmodelsRepository repository,
    Sui853ContractMapper contractMapper) : ControllerBase
{
    [HttpPost("vcfgapsempresa")]
    public async Task<IActionResult> VcfgApsEmpresa(CancellationToken cancellationToken)
    {
        var data = await repository.GetVcfgApsEmpresaAsync(cancellationToken);
        return Ok(contractMapper.MapOk(data));
    }

    [HttpPost("vcfgapsdocumento")]
    public async Task<IActionResult> VcfgApsDocumento(CancellationToken cancellationToken)
    {
        var data = await repository.GetVcfgApsDocumentoAsync(cancellationToken);
        return Ok(contractMapper.MapOk(data));
    }

    [HttpPost("tcfgAps")]
    public async Task<IActionResult> TcfgAps(CancellationToken cancellationToken)
    {
        var data = await repository.GetTcfgApsAsync(cancellationToken);
        return Ok(contractMapper.MapOk(data));
    }
}
