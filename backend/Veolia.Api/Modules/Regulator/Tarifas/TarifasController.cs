    using Microsoft.AspNetCore.Mvc;
    
    namespace Veolia.Api.Modules.Regulator.Tarifas;

    [ApiController]
    [Route("api/v1/tarifas")]
    public sealed class TarifasController(ITarifasRepository tarifasRepository) : ControllerBase
    {
        [HttpPost]
        public async Task<IActionResult> ConsultaTarifa([FromBody] TarifasApsPeriodoRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var data = await tarifasRepository.ConsultaTarifaAsync(request.aps, request.anno, request.mes, cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError(ex));
            }
        }

        [HttpPost("consultageneral")]
        public async Task<IActionResult> ConsultaGeneral([FromBody] TarifasApsPeriodoRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var data = await tarifasRepository.ConsultaGeneralAsync(request.anno, request.mes, cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError(ex));
            }
        }

        [HttpPost("tarxcom")]
        public async Task<IActionResult> TarifaPorComponente([FromBody] TarifasApsPeriodoRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var data = await tarifasRepository.TarifaPorComponenteAsync(request.aps, request.anno, request.mes, cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError(ex));
            }
        }

        [HttpPost("tarxcomgeneral")]
        public async Task<IActionResult> TarifaPorComponenteGeneral([FromBody] TarifasPeriodoRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var data = await tarifasRepository.TarifaPorComponenteGeneralAsync(request.anno, request.mes, cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError(ex));
            }
        }

        [HttpPost("resumen")]
        public async Task<IActionResult> Resumen([FromBody] TarifasApsPeriodoRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var data = await tarifasRepository.ResumenAsync(request.aps, request.anno, request.mes, cancellationToken);
                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, MapLegacyError(ex));
            }
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

    public sealed record TarifasApsPeriodoRequest(long aps, int anno, int mes);

    public sealed record TarifasPeriodoRequest(int anno, int mes);
