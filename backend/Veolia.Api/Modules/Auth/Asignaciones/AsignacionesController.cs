using Microsoft.AspNetCore.Mvc;

namespace Veolia.Api.Modules.Auth.Asignaciones;

[ApiController]
[Route("api/v1/auth")]
public class AsignacionesController(IAsignacionesRepository asignacionesRepository, AuthContractMapper contractMapper) : ControllerBase
{
    [HttpPost("getApsAsignadas")]
    public async Task<IActionResult> GetApsAsignadas([FromBody] IdRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var (asignadas, sinAsignar) = await asignacionesRepository.GetApsAsignadasAsync(request.id, cancellationToken);
            return Ok(contractMapper.MapApsAsignadas(asignadas, sinAsignar));
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                status = 500,
                response = ex.Message
            });
        }
    }

    [HttpPost("setApsxUsuario")]
    public async Task<IActionResult> SetApsxUsuario([FromBody] SetApsxUsuarioRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var response = await asignacionesRepository.SetApsxUsuarioAsync(request.id, request.outAps, request.inAps, cancellationToken);
            var mapped = contractMapper.MapSetApsxUsuarioResult(response);

            return mapped is null
                ? StatusCode(StatusCodes.Status200OK)
                : Ok(mapped);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                status = 500,
                response = ex.Message
            });
        }
    }

    [HttpPost("getSistemasPorUsuario")]
    public async Task<IActionResult> GetSistemasPorUsuario([FromBody] GetSistemasPorUsuarioRequest request, CancellationToken cancellationToken)
    {
        var (sisuId, asignados, sinAsignar) = await asignacionesRepository.GetSistemasPorUsuarioAsync(request.correo, cancellationToken);
        return Ok(new { sisuId, asignados, sinAsignar });
    }

    [HttpPost("asignarSistema")]
    public async Task<IActionResult> AsignarSistema([FromBody] AsignarSistemaRequest request, CancellationToken cancellationToken)
    {
        var message = await asignacionesRepository.AsignarSistemaAsync(request.sisuId, request.asignados, request.noAsignados, cancellationToken);
        return Ok(contractMapper.MapAsignarSistemaSuccess(message));
    }
}

public sealed record IdRequest(long id);
public sealed record SetApsxUsuarioRequest(long id, IReadOnlyList<long> outAps, IReadOnlyList<long> inAps);
public sealed record GetSistemasPorUsuarioRequest(string correo);
public sealed record AsignarSistemaRequest(long sisuId, IReadOnlyList<long> asignados, IReadOnlyList<long> noAsignados);
