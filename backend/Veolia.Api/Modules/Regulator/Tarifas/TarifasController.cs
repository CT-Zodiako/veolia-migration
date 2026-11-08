    using Microsoft.AspNetCore.Mvc;
    
    namespace Veolia.Api.Modules.Regulator.Tarifas;

    [ApiController]
    [Route("api/v1/tarifas")]
    public sealed class TarifasController(ITarifasRepository tarifasRepository) : ControllerBase
    {
        [HttpPost]
        public async Task<IActionResult> ConsultaTarifa([FromBody] TarifasApsPeriodoRequest request, CancellationToken cancellationToken)
        {
            var data = await tarifasRepository.ConsultaTarifaAsync(request.aps, request.anno, request.mes, cancellationToken);
            return Ok(data);
        }

        [HttpPost("consultageneral")]
        public async Task<IActionResult> ConsultaGeneral([FromBody] TarifasApsPeriodoRequest request, CancellationToken cancellationToken)
        {
            var data = await tarifasRepository.ConsultaGeneralAsync(request.anno, request.mes, cancellationToken);
            return Ok(data);
        }

        [HttpPost("tarxcom")]
        public async Task<IActionResult> TarifaPorComponente([FromBody] TarifasApsPeriodoRequest request, CancellationToken cancellationToken)
        {
            var data = await tarifasRepository.TarifaPorComponenteAsync(request.aps, request.anno, request.mes, cancellationToken);
            return Ok(data);
        }

        [HttpPost("tarxcomgeneral")]
        public async Task<IActionResult> TarifaPorComponenteGeneral([FromBody] TarifasPeriodoRequest request, CancellationToken cancellationToken)
        {
            var data = await tarifasRepository.TarifaPorComponenteGeneralAsync(request.anno, request.mes, cancellationToken);
            return Ok(data);
        }

        [HttpPost("resumen")]
        public async Task<IActionResult> Resumen([FromBody] TarifasApsPeriodoRequest request, CancellationToken cancellationToken)
        {
            var data = await tarifasRepository.ResumenAsync(request.aps, request.anno, request.mes, cancellationToken);
            return Ok(data);
        }
    }

    public sealed record TarifasApsPeriodoRequest(long aps, int anno, int mes);

    public sealed record TarifasPeriodoRequest(int anno, int mes);
