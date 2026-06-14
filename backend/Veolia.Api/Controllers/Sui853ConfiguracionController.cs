using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Infrastructure.Sui853;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/v1/sui853Configuracion")]
public sealed class Sui853ConfiguracionController(
    ISui853ReadmodelsRepository repository,
    Sui853ContractMapper contractMapper) : ControllerBase
{
    [HttpPost("vcfgapsempresa")]
    public async Task<IActionResult> VcfgApsEmpresa(CancellationToken cancellationToken)
    {
        try
        {
            var data = await repository.GetVcfgApsEmpresaAsync(cancellationToken);
            return Ok(contractMapper.MapOk(data));
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, contractMapper.MapError());
        }
    }

    [HttpPost("vcfgapsdocumento")]
    public async Task<IActionResult> VcfgApsDocumento(CancellationToken cancellationToken)
    {
        try
        {
            var data = await repository.GetVcfgApsDocumentoAsync(cancellationToken);
            return Ok(contractMapper.MapOk(data));
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, contractMapper.MapError());
        }
    }

    [HttpPost("tcfgAps")]
    public async Task<IActionResult> TcfgAps(CancellationToken cancellationToken)
    {
        try
        {
            var data = await repository.GetTcfgApsAsync(cancellationToken);
            return Ok(contractMapper.MapOk(data));
        }
        catch
        {
            return StatusCode(StatusCodes.Status500InternalServerError, contractMapper.MapError());
        }
    }
}
