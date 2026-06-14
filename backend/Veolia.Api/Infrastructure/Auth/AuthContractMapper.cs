namespace Veolia.Api.Infrastructure.Auth;

public class AuthContractMapper
{
    public object MapLoginSuccess(object usuario, string authToken, object sistema, string message = "OK")
        => new
        {
            status = 200,
            message,
            usuario,
            auth_token = authToken,
            sistema
        };

    public object MapLoginError(int status, string message)
        => new
        {
            status,
            message
        };

    // Legacy quirk: key casing must be MENU_ID.
    public IReadOnlyList<object> MapUserMenuIds(IEnumerable<long> menuIds)
        => menuIds.Select(id => (object)new Dictionary<string, object> { ["MENU_ID"] = id }).ToList();

    // Legacy quirk: resetPass returns plain text, not a JSON object.
    public string MapResetPassPlainText(string newPass)
        => newPass;

    // Legacy quirk: setApsxUsuario can return empty/undefined body on success.
    public object? MapSetApsxUsuarioResult(object? repositoryResult)
        => repositoryResult;

    public object MapSistemasPorUsuario(IReadOnlyList<object> asignados, IReadOnlyList<object> sinAsignar)
        => new
        {
            asignados,
            sinAsignar
        };

    public object MapApsAsignadas(IReadOnlyList<object> asignadas, IReadOnlyList<object> sinAsignar)
        => new
        {
            asignadas,
            sinAsignar
        };

    public object MapAsignarSistemaSuccess(string message)
        => new
        {
            status = 200,
            message
        };

    public object MapChangePassResponse(int status, string response, string msg)
        => new
        {
            status,
            response,
            msg
        };
}
