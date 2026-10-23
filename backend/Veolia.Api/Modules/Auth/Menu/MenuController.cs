using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Modules.Auth.Menu;

[ApiController]
[Route("api/v1/auth")]
public class MenuController(
    IMenuRepository menuRepository,
    AuthContractMapper contractMapper,
    IUserAdminAuthorization userAdminAuthorization) : ControllerBase
{
    [HttpPost("getUserMenu")]
    public async Task<IActionResult> GetUserMenu(CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        var menuIds = await menuRepository.GetUserMenuAsync(tokenContext.SisuId, tokenContext.IdSistema, cancellationToken);
        return Ok(contractMapper.MapUserMenuIds(menuIds));
    }

    [HttpPost("getMenuByUser")]
    public async Task<IActionResult> GetMenuByUser([FromBody] GetMenuByUserRequest request, CancellationToken cancellationToken)
    {
        if (await userAdminAuthorization.RequireSelfOrAdminAsync(Request, request.sisuId, cancellationToken) is { } denied)
        {
            return denied;
        }

        var menuIds = await menuRepository.GetMenuByUserAsync(request.idSistema, request.sisuId, cancellationToken);
        return Ok(menuIds);
    }

    // Legacy MenuxUsuario.vue loads the tree of the system selected on screen. Only a user
    // administrator may read another system's tree; anyone else gets the session system's tree,
    // which is what the layout and dashboard request.
    [HttpPost("getGeneralMenuTree")]
    public async Task<IActionResult> GetGeneralMenuTree(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] GetGeneralMenuTreeRequest? request,
        CancellationToken cancellationToken)
    {
        if (!TryReadTokenContext(out var tokenContext))
        {
            return Unauthorized(new { message = "No Autorizado!" });
        }

        var idSistema = tokenContext.IdSistema;
        if (request is { idSistema: > 0 } && request.idSistema != tokenContext.IdSistema
            && await userAdminAuthorization.IsAdminAsync(tokenContext.SisuId, cancellationToken))
        {
            idSistema = request.idSistema;
        }

        var tree = await menuRepository.GetGeneralMenuTreeAsync(tokenContext.SisuId, idSistema, cancellationToken);
        return Ok(tree);
    }

    [HttpPost("getMenuUserOptions")]
    public async Task<IActionResult> GetMenuUserOptions([FromBody] IdRequest request, CancellationToken cancellationToken)
    {
        if (await userAdminAuthorization.RequireSelfOrAdminAsync(Request, request.id, cancellationToken) is { } denied)
        {
            return denied;
        }

        var menuIds = await menuRepository.GetMenuUserOptionsAsync(request.id, cancellationToken);
        return Ok(menuIds);
    }

    [HttpPost("uptUserMenu")]
    public async Task<IActionResult> UptUserMenu([FromBody] UptUserMenuRequest request, CancellationToken cancellationToken)
    {
        if (await userAdminAuthorization.RequireAdminAsync(Request, cancellationToken) is { } denied)
        {
            return denied;
        }

        var response = await menuRepository.UptUserMenuAsync(request.id, request.options, request.sistema, cancellationToken);
        return Ok(response);
    }

    [HttpPost("getMenuCatalog")]
    public async Task<IActionResult> GetMenuCatalog(CancellationToken cancellationToken)
    {
        var catalog = await menuRepository.GetMenuCatalogAsync(cancellationToken);
        return Ok(catalog);
    }

    private bool TryReadTokenContext(out AuthTokenContext tokenContext)
    {
        var token = Request.Headers["x-access-token"].FirstOrDefault();
        return AuthTokenContextAccessor.TryRead(token, out tokenContext);
    }
}

public sealed record IdRequest(long id);
public sealed record GetMenuByUserRequest(int idSistema, long sisuId);
public sealed record GetGeneralMenuTreeRequest(int idSistema);
public sealed record UptUserMenuRequest(long id, IReadOnlyList<long> options, int sistema);
