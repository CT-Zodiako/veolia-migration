using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController(IHealthRepository healthRepository) : ControllerBase
{
    [HttpGet]
    public IActionResult GetAppHealth()
    {
        return Ok(new
        {
            status = "ok",
            service = "backend",
            timestampUtc = DateTime.UtcNow
        });
    }

    [HttpGet("db")]
    public async Task<IActionResult> GetDatabaseHealth(CancellationToken cancellationToken)
    {
        var result = await healthRepository.CheckDatabaseAsync(cancellationToken);

        if (result.IsConnected)
        {
            return Ok(new
            {
                status = "ok",
                target = "oracle",
                message = result.Message,
                timestampUtc = DateTime.UtcNow
            });
        }

        return StatusCode(StatusCodes.Status503ServiceUnavailable, new
        {
            status = "error",
            target = "oracle",
            message = result.Message,
            timestampUtc = DateTime.UtcNow
        });
    }
}
