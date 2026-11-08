using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Regulator.Aps;

[ApiController]
[Route("api/v1/aps")]
public sealed class ApsController(
    IApsRepository apsRepository,
    ApsContractMapper contractMapper) : ControllerBase
{
    [HttpPost("consultageneral")]
    public async Task<IActionResult> ConsultaGeneral(CancellationToken cancellationToken)
    {
        var data = await apsRepository.ConsultaGeneralAsync(cancellationToken);
        return Ok(data);
    }

    [HttpPost("consultaaps")]
    public async Task<IActionResult> ConsultaAps([FromBody] ApsByIdRequest request, CancellationToken cancellationToken)
    {
        var data = await apsRepository.ConsultaApsAsync(request.aps, cancellationToken);
        return Ok(data);
    }

    [HttpPost("crear")]
    public async Task<IActionResult> Crear([FromBody] ApsMutationRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
            return Unauthorized(new { message = "No Autorizado!" });

        var result = await apsRepository.CrearAsync(
            request.nombre,
            request.idsui,
            request.resolucion,
            request.propio,
            request.relleno,
            request.estado,
            request.iat,
            tokenContext.SisuId,
            cancellationToken);

        return Ok(contractMapper.MapMutationResponse(result));
    }

    [HttpPut("editar/{id:long}")]
    public async Task<IActionResult> Editar(long id, [FromBody] ApsMutationRequest request, CancellationToken cancellationToken)
    {
        var result = await apsRepository.EditarAsync(
            id,
            request.nombre,
            request.idsui,
            request.resolucion,
            request.propio,
            request.relleno,
            request.estado,
            request.iat,
            cancellationToken);

        return Ok(contractMapper.MapMutationResponse(result));
    }

    [HttpGet]
    public async Task<IActionResult> GetApsByUsuario(CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        var data = await apsRepository.GetApsByUsuarioAsync(tokenContext.SisuId, cancellationToken);
        return Ok(data);
    }

    [HttpPost("usuarioPorAPS")]
    public async Task<IActionResult> UsuarioPorAps([FromBody] ApsByIdRequest request, CancellationToken cancellationToken)
    {
        var data = await apsRepository.GetUsuarioPorApsAsync(request.aps, cancellationToken);
        return Ok(data);
    }

    [HttpDelete("eliminar/{id:long}")]
    public async Task<IActionResult> Eliminar(long id, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(new { message = "No Autorizado!" });

        var result = await apsRepository.EliminarAsync(id, cancellationToken);
        return Ok(result);
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }
}

public sealed record ApsByIdRequest(long aps);

public sealed record ApsMutationRequest(
    string nombre,
    string? idsui,
    int? resolucion,
    int propio,
    int relleno,
    int estado,
    int iat);
