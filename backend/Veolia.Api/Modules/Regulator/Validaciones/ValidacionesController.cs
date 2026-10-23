    using Microsoft.AspNetCore.Mvc;
    
    namespace Veolia.Api.Modules.Regulator.Validaciones;

    [ApiController]
    [Route("api/v1/validaciones")]
    public sealed class ValidacionesController(IValidacionesRepository validacionesRepository) : ControllerBase
    {
        [HttpPost("certificarfauco_existarifa")]
        public Task<IActionResult> FaucoExistarifa([FromBody] ValidacionRequest request, CancellationToken cancellationToken) =>
            ExecuteAsync("fauco_generasui", request, cancellationToken);

        [HttpPost("certificarFauco_cpsuivsfact")]
        public Task<IActionResult> FaucoCpsuivsfact([FromBody] ValidacionRequest request, CancellationToken cancellationToken) =>
            ExecuteAsync("fauco_cpsuivsfact", request, cancellationToken);

        [HttpPost("certificarFauco_cpproductividad")]
        public Task<IActionResult> FaucoCpproductividad([FromBody] ValidacionRequest request, CancellationToken cancellationToken) =>
            ExecuteAsync("fauco_cpproductividad", request, cancellationToken);

        [HttpPost("certificarFauco_cpenero")]
        public Task<IActionResult> FaucoCpenero([FromBody] ValidacionRequest request, CancellationToken cancellationToken) =>
            ExecuteAsync("fauco_cpenero", request, cancellationToken);

        [HttpPost("certificarFauco_integracion")]
        public Task<IActionResult> FaucoIntegracion([FromBody] ValidacionRequest request, CancellationToken cancellationToken) =>
            ExecuteAsync("fauco_integracion", request, cancellationToken);

        [HttpPost("certificarfauco_existerelleno")]
        public Task<IActionResult> FaucoExisterelleno([FromBody] ValidacionRequest request, CancellationToken cancellationToken) =>
            ExecuteAsync("fauco_existerelleno", request, cancellationToken);

        [HttpPost("certificarfauco_existarifacert")]
        public Task<IActionResult> FaucoExistarifacert([FromBody] ValidacionRequest request, CancellationToken cancellationToken) =>
            ExecuteAsync("fauco_tarifacert", request, cancellationToken);

        private async Task<IActionResult> ExecuteAsync(string functionName, ValidacionRequest request, CancellationToken cancellationToken)
        {
            try
            {
                var raw = await validacionesRepository.ExecuteAsync(functionName, request.aps, request.anno, request.mes, cancellationToken);
                var normalized = Normalize(raw, functionName);
                return Ok(normalized);
            }
            catch (Exception ex)
            {
                return StatusCode(StatusCodes.Status500InternalServerError, new ValidacionResponse(false, $"Error técnico: {ex.Message}"));
            }
        }

        // Legacy validaciones/controller.js returns the raw result and each caller accepts one value: Calculo.vue:272-304,506-515
        // only 0; Suisui.vue:187-201 only 1 for certificarfauco_existarifa (fauco_generasui). Any other value is a failure.
        private static ValidacionResponse Normalize(string? raw, string functionName)
        {
            var okValue = functionName == "fauco_generasui" ? "1" : "0";
            if (string.Equals(raw, okValue, StringComparison.Ordinal))
            {
                return new ValidacionResponse(true, null);
            }

            return new ValidacionResponse(false, raw);
        }
    }
