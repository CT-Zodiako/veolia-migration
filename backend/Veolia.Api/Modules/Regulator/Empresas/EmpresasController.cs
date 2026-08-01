using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Regulator.Empresas;

[ApiController]
[Route("api/v1/empresas")]
public sealed class EmpresasController(IEmpresasRepository empresasRepository) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        try
        {
            var data = await empresasRepository.GetAllAsync(cancellationToken);
            return Ok(data);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError(ex));
        }
    }

    [HttpPost("crear")]
    public async Task<IActionResult> Crear([FromBody] EmpresaCreateRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        try
        {
            var result = await empresasRepository.CreateAsync(
                request.nombre,
                request.estado,
                request.propia,
                request.nuap,
                tokenContext.SisuId,
                cancellationToken);

            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError(ex));
        }
    }

    [HttpPost("consultarpropias")]
    public async Task<IActionResult> ConsultarPropias([FromBody] EmpresaConsultarPropiasRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var data = await empresasRepository.ConsultarPropiasAsync(request.aps, request.propia, cancellationToken);
            return Ok(data);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError(ex));
        }
    }

    [HttpPost("consultaempr")]
    public async Task<IActionResult> ConsultaEmpr([FromBody] EmpresaConsultaEmprRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var data = await empresasRepository.ConsultaEmprAsync(request.empr, cancellationToken);
            return Ok(data);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError(ex));
        }
    }

    [HttpPut("editar/{id:long}")]
    public async Task<IActionResult> Editar(long id, [FromBody] EmpresaEditRequest request, CancellationToken cancellationToken)
    {
        try
        {
            var result = await empresasRepository.UpdateAsync(id, request.nombre, request.estado, request.propia, request.nuap, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError(ex));
        }
    }

    [HttpDelete("eliminar/{id:long}")]
    public async Task<IActionResult> Eliminar(long id, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(new { message = "No Autorizado!" });

        try
        {
            var result = await empresasRepository.EliminarAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError(ex));
        }
    }

    [HttpPatch("toggle-estado/{id:long}")]
    public async Task<IActionResult> ToggleEstado(long id, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(new { message = "No Autorizado!" });

        try
        {
            var result = await empresasRepository.ToggleEstadoAsync(id, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError(ex));
        }
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }

    private static object MapLegacyError(Exception ex)
    {
        var oracleEx = ex as Oracle.ManagedDataAccess.Client.OracleException;
        return new
        {
            data = "Error",
            message = ex.Message,
            oraCode = oracleEx is not null ? $"ORA-{Math.Abs(oracleEx.Number):D5}" : null
        };
    }
}

public sealed record EmpresaCreateRequest(string nombre, int estado, int propia, string? nuap);

public sealed record EmpresaConsultarPropiasRequest(long aps, int propia);

public sealed record EmpresaConsultaEmprRequest(long empr);

public sealed record EmpresaEditRequest(string nombre, int estado, int propia, string? nuap);
