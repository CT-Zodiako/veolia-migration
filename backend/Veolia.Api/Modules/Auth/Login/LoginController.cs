using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Auth.Login;

[ApiController]
[Route("api/v1/auth")]
public class LoginController(ILoginRepository loginRepository, AuthContractMapper contractMapper, IConfiguration configuration) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await loginRepository.LoginAsync(request.correo, request.pass, request.idSistema, cancellationToken);

        if (result is not LoginRepositoryResult loginResult)
        {
            return Unauthorized(contractMapper.MapLoginError(401, "Correo o contraseña inválida"));
        }

        if (loginResult.Kind == LoginOutcomeKind.Success && loginResult.Usuario is Dictionary<string, object?> usuario)
        {
            var supportCorreo = configuration["Support:Correo"];
            usuario["esSoporte"] = !string.IsNullOrWhiteSpace(supportCorreo)
                && string.Equals(request.correo, supportCorreo, StringComparison.OrdinalIgnoreCase);
        }

        return loginResult.Kind switch
        {
            LoginOutcomeKind.Success when loginResult.Usuario is not null && loginResult.Sistema is not null && !string.IsNullOrWhiteSpace(loginResult.AuthToken)
                => Ok(contractMapper.MapLoginSuccess(loginResult.Usuario, loginResult.AuthToken!, loginResult.Sistema, loginResult.Message)),

            LoginOutcomeKind.InvalidSystem
                => StatusCode(StatusCodes.Status404NotFound, contractMapper.MapLoginError(404, loginResult.Message)),

            LoginOutcomeKind.InvalidCredentials
                => Unauthorized(contractMapper.MapLoginError(401, loginResult.Message)),

            _ => StatusCode(StatusCodes.Status500InternalServerError, contractMapper.MapLoginError(500, "Error de autenticación"))
        };
    }

    [HttpPost("switchSistema")]
    public async Task<IActionResult> SwitchSistema([FromBody] SwitchSistemaRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        var result = await loginRepository.SwitchSistemaAsync(tokenContext.SisuId, request.idSistema, cancellationToken);

        return result.Kind switch
        {
            LoginOutcomeKind.Success when result.Sistema is not null && !string.IsNullOrWhiteSpace(result.AuthToken)
                => Ok(contractMapper.MapSwitchSistemaSuccess(result.AuthToken!, result.Sistema)),

            LoginOutcomeKind.InvalidSystem
                => StatusCode(StatusCodes.Status404NotFound, contractMapper.MapLoginError(404, result.Message)),

            _ => StatusCode(StatusCodes.Status500InternalServerError, contractMapper.MapLoginError(500, "Error al cambiar de sistema"))
        };
    }

    [HttpGet("allSistemas")]
    public async Task<IActionResult> AllSistemas(CancellationToken cancellationToken)
    {
        var sistemas = await loginRepository.AllSistemasAsync(cancellationToken);
        return Ok(sistemas);
    }

    [HttpGet("getSistemasByCorreo")]
    public async Task<IActionResult> GetSistemasByCorreo([FromQuery] string correo, CancellationToken cancellationToken)
    {
        try
        {
            var sistemas = await loginRepository.GetSistemasByCorreoAsync(correo, cancellationToken);
            return Ok(sistemas);
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

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        if (!TryReadTokenContext(out var tokenContext) || string.IsNullOrWhiteSpace(token))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        var response = await loginRepository.LogoutAsync(tokenContext.SisuId, token, cancellationToken);
        return Ok(response);
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }
}

public sealed record LoginRequest(string correo, string pass, int idSistema);
public sealed record SwitchSistemaRequest(int idSistema);
