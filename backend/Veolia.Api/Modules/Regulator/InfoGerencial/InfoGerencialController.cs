    using Microsoft.AspNetCore.Mvc;
    using Veolia.Api.Contracts.Responses;
    using Veolia.Api.Infrastructure.Auth;

    namespace Veolia.Api.Modules.Regulator.InfoGerencial;

    [ApiController]
    [Route("api/v1/infogerencial")]
    public sealed class InfoGerencialController(IInfoGerencialRepository repository) : ControllerBase
    {
        [HttpPost("detcostos")]
        public async Task<IActionResult> GetDetalleCostos([FromBody] PeriodoRequestDto request, CancellationToken cancellationToken)
        {
            if (!TryReadTokenContext(out _))
                return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

            if (request.Anno <= 0 || request.Mes is < 1 or > 12)
                return BadRequest(Envelope("error", Array.Empty<object>(), "anno y mes son obligatorios. mes debe estar entre 1 y 12."));

            var rows = await repository.GetDetalleCostosAsync(request.Anno, request.Mes, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }

        [HttpPost("detsubaporte")]
        public async Task<IActionResult> GetDetalleSubAporte([FromBody] PeriodoRequestDto request, CancellationToken cancellationToken)
        {
            if (!TryReadTokenContext(out _))
                return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

            if (request.Anno <= 0 || request.Mes is < 1 or > 12)
                return BadRequest(Envelope("error", Array.Empty<object>(), "anno y mes son obligatorios. mes debe estar entre 1 y 12."));

            var rows = await repository.GetDetalleSubAporteAsync(request.Anno, request.Mes, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }

        [HttpPost("infoapsemprdivi")]
        public async Task<IActionResult> GetInfoApsEmprDivi([FromBody] ApsPeriodoRequestDto request, CancellationToken cancellationToken)
        {
            if (!TryReadTokenContext(out _))
                return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

            if (request.Aps <= 0 || request.Anno <= 0 || request.Mes is < 1 or > 12)
                return BadRequest(Envelope("error", Array.Empty<object>(), "aps, anno y mes son obligatorios. mes debe estar entre 1 y 12."));

            var rows = await repository.GetInfoApsEmprDiviAsync(request.Aps, request.Anno, request.Mes, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }

        [HttpPost("infoemprdivi")]
        public async Task<IActionResult> GetInfoEmprDivi([FromBody] ApsPeriodoRequestDto request, CancellationToken cancellationToken)
        {
            if (!TryReadTokenContext(out _))
                return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

            if (request.Aps <= 0 || request.Anno <= 0 || request.Mes is < 1 or > 12)
                return BadRequest(Envelope("error", Array.Empty<object>(), "aps, anno y mes son obligatorios. mes debe estar entre 1 y 12."));

            var rows = await repository.GetInfoEmprDiviAsync(request.Aps, request.Anno, request.Mes, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }

        [HttpPost("infoapsrelleno")]
        public async Task<IActionResult> GetInfoApsRelleno([FromBody] ApsPeriodoRequestDto request, CancellationToken cancellationToken)
        {
            if (!TryReadTokenContext(out _))
                return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

            if (request.Aps <= 0 || request.Anno <= 0 || request.Mes is < 1 or > 12)
                return BadRequest(Envelope("error", Array.Empty<object>(), "aps, anno y mes son obligatorios. mes debe estar entre 1 y 12."));

            var rows = await repository.GetInfoApsRellenoAsync(request.Aps, request.Anno, request.Mes, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }

        [HttpPost("getDashBoardGerencial")]
        public async Task<IActionResult> GetDashBoardGerencial([FromBody] PeriodoRequestDto request, CancellationToken cancellationToken)
        {
            if (!TryReadTokenContext(out var tokenContext))
                return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

            if (request.Anno <= 0 || request.Mes is < 1 or > 12)
                return BadRequest(Envelope("error", Array.Empty<object>(), "anno y mes son obligatorios. mes debe estar entre 1 y 12."));

            var rows = await repository.GetDashBoardGerencialAsync(request.Anno, request.Mes, tokenContext.SisuId, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }

        [HttpPost("costoPoda")]
        public async Task<IActionResult> GetCostoPoda([FromBody] ApsRequestDto request, CancellationToken cancellationToken)
        {
            if (!TryReadTokenContext(out _))
                return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

            if (request.Aps <= 0)
                return BadRequest(Envelope("error", Array.Empty<object>(), "aps es obligatorio."));

            var rows = await repository.GetCostoPodaAsync(request.Aps, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }

        [HttpPost("getapsDesCost")]
        public async Task<IActionResult> GetApsDesCost([FromBody] ApsPeriodoRequestDto request, CancellationToken cancellationToken)
        {
            if (!TryReadTokenContext(out _))
                return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

            if (request.Aps <= 0 || request.Anno <= 0 || request.Mes is < 1 or > 12)
                return BadRequest(Envelope("error", Array.Empty<object>(), "aps, anno y mes son obligatorios. mes debe estar entre 1 y 12."));

            var rows = await repository.GetDescuentosAsync(request.Aps, request.Anno, request.Mes, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }

        [HttpPost("getapsDesCostUnico")]
        public async Task<IActionResult> GetApsDesCostUnico([FromBody] DescuentoCatalogoRequestDto request, CancellationToken cancellationToken)
        {
            if (!TryReadTokenContext(out _))
                return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

            if (request.Aps <= 0 || request.Anno <= 0 || request.Mes is < 1 or > 12)
                return BadRequest(Envelope("error", Array.Empty<object>(), "aps, anno y mes son obligatorios. mes debe estar entre 1 y 12."));

            var rows = await repository.GetCatalogoDescuentoAsync(request.Id, request.Aps, request.Anno, request.Mes, request.IsNew, cancellationToken);
            return Ok(Envelope("success", rows, "OK"));
        }

        [HttpPost("setapsDesCost")]
        public async Task<IActionResult> SetApsDesCost([FromBody] DescuentoGuardarRequestDto request, CancellationToken cancellationToken)
        {
            if (!TryReadTokenContext(out var tokenContext))
                return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

            if (request.Aps <= 0 || request.Anno <= 0 || request.Mes is < 1 or > 12 || request.Id <= 0)
                return BadRequest(Envelope("error", Array.Empty<object>(), "aps, anno, mes e id son obligatorios. mes debe estar entre 1 y 12."));

            await repository.InsertDescuentoAsync(request.Aps, request.Anno, request.Mes, request.Id, request.Valor, tokenContext.SisuId, cancellationToken);
            return Ok(Envelope("success", new { }, "Descuento registrado correctamente."));
        }

        [HttpPost("uptapsDesCost")]
        public async Task<IActionResult> UptApsDesCost([FromBody] DescuentoGuardarRequestDto request, CancellationToken cancellationToken)
        {
            if (!TryReadTokenContext(out _))
                return Unauthorized(Envelope("error", Array.Empty<object>(), "No autorizado."));

            if (request.Aps <= 0 || request.Anno <= 0 || request.Mes is < 1 or > 12 || request.Id <= 0)
                return BadRequest(Envelope("error", Array.Empty<object>(), "aps, anno, mes e id son obligatorios. mes debe estar entre 1 y 12."));

            await repository.UpdateDescuentoAsync(request.Aps, request.Anno, request.Mes, request.Id, request.Valor, cancellationToken);
            return Ok(Envelope("success", new { }, "Descuento actualizado correctamente."));
        }

        private bool TryReadTokenContext(out AuthTokenContext tokenContext)
        {
            var token = Request.Headers["x-access-token"].FirstOrDefault();
            return AuthTokenContextAccessor.TryRead(token, out tokenContext);
        }

        private ApiEnvelopeResponse<T> Envelope<T>(string status, T data, string message)
            => new(status, data, message, HttpContext.TraceIdentifier, null);
    }
