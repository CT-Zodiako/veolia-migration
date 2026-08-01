using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Regulator.General;

/// <summary>
/// Servicio de catálogos transversales. Migración del módulo legacy "general"
/// (back-tarificador/src/modules/general), que exponía 4 endpoints GET:
///
/// - consultauso  -> migrado aquí (sin overlap real: Proyecciones expone un
///   subconjunto de columnas con propósito propio, este necesita SELECT * real).
/// - paraindices  -> NO migrado como endpoint nuevo. Es un duplicado exacto de
///   GET /api/v1/indices/catalogo (IndicesRepository.GetCatalogoAsync, misma
///   tabla AUGE_PARAMETROS CLAS_CLAS = 20011, mismas columnas PARA_PARA/PARA_NOMBRE),
///   verificado 1:1 contra Oracle real. Duplicar el mismo SQL en dos controladores
///   solo agregaría superficie de mantenimiento sin beneficio; los consumidores de
///   "paraindices" deben apuntar a /api/v1/indices/catalogo.
/// - paracostos   -> migrado aquí (sin overlap: CLAS_CLAS = 20010 no tiene otra
///   fuente en el nuevo stack).
/// - GET /:id     -> placeholder legacy sin lógica real ("mostrar un registro
///   especifico..."). Se retira, tal como indica la nota de migración del módulo.
/// </summary>
[ApiController]
[Route("api/v1/general")]
public sealed class GeneralController(IGeneralRepository repository) : ControllerBase
{
    [HttpGet("consultauso")]
    public async Task<IActionResult> ConsultarUso(CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(new { message = "No Autorizado!" });

        try
        {
            var rows = await repository.ConsultarUsoAsync(cancellationToken);
            return Ok(rows);
        }
        catch (Exception ex)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError(ex));
        }
    }

    [HttpGet("paracostos")]
    public async Task<IActionResult> ParaCostos(CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out _))
            return Unauthorized(new { message = "No Autorizado!" });

        try
        {
            var rows = await repository.ConsultarCostosAsync(cancellationToken);
            return Ok(rows);
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
