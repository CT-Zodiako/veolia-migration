using Microsoft.AspNetCore.Mvc;
using Veolia.Api.Modules.Auth.Menu;

namespace Veolia.Api.Infrastructure.Auth;

/// <summary>
/// User administration is reserved to callers holding menu 204 "Usuarios" of system 1
/// (VEO-Regulator) in AUGE_USUAMENU (S10). The permission is read with the same query as
/// getUserMenu, whatever system the caller is currently logged into.
/// Controllers call this before touching the repository; a non-null result is the rejection
/// to return as is.
/// </summary>
public interface IUserAdminAuthorization
{
    /// <summary>Allows only user administrators.</summary>
    Task<IActionResult?> RequireAdminAsync(HttpRequest request, CancellationToken cancellationToken);

    /// <summary>Allows the caller acting on their own account, or a user administrator.</summary>
    Task<IActionResult?> RequireSelfOrAdminAsync(HttpRequest request, long targetSisuId, CancellationToken cancellationToken);

    Task<bool> IsAdminAsync(long sisuId, CancellationToken cancellationToken);
}

public sealed class UserAdminAuthorization(IMenuRepository menuRepository) : IUserAdminAuthorization
{
    public const long UsuariosMenuId = 204;
    public const int RegulatorSistemaId = 1;
    public const string NotAdminMessage = "No tiene permisos para administrar usuarios";

    public Task<IActionResult?> RequireAdminAsync(HttpRequest request, CancellationToken cancellationToken)
        => AuthorizeAsync(request, targetSisuId: null, cancellationToken);

    public Task<IActionResult?> RequireSelfOrAdminAsync(HttpRequest request, long targetSisuId, CancellationToken cancellationToken)
        => AuthorizeAsync(request, targetSisuId, cancellationToken);

    public async Task<bool> IsAdminAsync(long sisuId, CancellationToken cancellationToken)
    {
        var menuIds = await menuRepository.GetUserMenuAsync(sisuId, RegulatorSistemaId, cancellationToken);
        return menuIds.Contains(UsuariosMenuId);
    }

    private async Task<IActionResult?> AuthorizeAsync(HttpRequest request, long? targetSisuId, CancellationToken cancellationToken)
    {
        var token = request.Headers["x-access-token"].FirstOrDefault();
        if (!AuthTokenContextAccessor.TryRead(token, out var caller))
        {
            return new UnauthorizedObjectResult(new { message = "No Autorizado!" });
        }

        if (targetSisuId == caller.SisuId || await IsAdminAsync(caller.SisuId, cancellationToken))
        {
            return null;
        }

        return new ObjectResult(new { message = NotAdminMessage }) { StatusCode = StatusCodes.Status403Forbidden };
    }
}
