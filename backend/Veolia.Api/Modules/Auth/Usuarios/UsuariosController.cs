using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Auth.Usuarios;

[ApiController]
[Route("api/v1/auth")]
public class UsuariosController(IUsuariosRepository usuariosRepository, AuthContractMapper contractMapper) : ControllerBase
{
    [HttpPost("registro")]
    public async Task<IActionResult> Registro([FromBody] RegistroRequest request, CancellationToken cancellationToken)
    {
        var result = await usuariosRepository.RegistroAsync(
            request.nombre,
            request.apellido,
            request.correo,
            request.password,
            request.estado,
            cancellationToken);

        if (result.IsDuplicateEmail)
        {
            return BadRequest(new { message = result.Message ?? "El correo ya se encuentra registrado" });
        }

        return Ok(result.Payload);
    }

    [HttpPost("updateUsuario")]
    public async Task<IActionResult> UpdateUsuario([FromBody] UpdateUsuarioRequest request, CancellationToken cancellationToken)
    {
        var result = await usuariosRepository.UpdateUsuarioAsync(
            request.id,
            request.nombre,
            request.apellido,
            request.correo,
            request.estado,
            cancellationToken);

        if (result.IsDuplicateEmail)
        {
            return BadRequest(new { message = result.Message ?? "El correo ya se encuentra registrado" });
        }

        return Ok(result.Payload);
    }

    [HttpPost("setChangePass")]
    public async Task<IActionResult> SetChangePass([FromBody] SetChangePassRequest request, CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        var result = await usuariosRepository.SetChangePassAsync(
            tokenContext.SisuId,
            request.oldPass,
            request.newPass,
            request.confirmPass,
            cancellationToken);

        return StatusCode(result.Status, contractMapper.MapChangePassResponse(result.Status, result.Response, result.Msg));
    }

    [HttpGet("getAllUsers")]
    public async Task<IActionResult> GetAllUsers(CancellationToken cancellationToken)
    {
        var users = await usuariosRepository.GetAllUsersAsync(cancellationToken);
        return Ok(users);
    }

    [HttpPost("getUserbyId")]
    public async Task<IActionResult> GetUserById([FromBody] IdRequest request, CancellationToken cancellationToken)
    {
        var users = await usuariosRepository.GetUserByIdAsync(request.id, cancellationToken);
        return Ok(users);
    }

    [HttpPost("resetPass")]
    public async Task<IActionResult> ResetPass([FromBody] IdRequest request, CancellationToken cancellationToken)
    {
        var newPass = await usuariosRepository.ResetPassAsync(request.id, cancellationToken);
        return Content(contractMapper.MapResetPassPlainText(newPass), "text/plain");
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }
}

public sealed record RegistroRequest(string nombre, string apellido, string correo, string password, int estado);
public sealed record UpdateUsuarioRequest(long id, string nombre, string apellido, string correo, int estado);
public sealed record SetChangePassRequest(string oldPass, string newPass, string confirmPass);
public sealed record IdRequest(long id);
