namespace Veolia.Api.Modules.Auth.Login;

public interface ILoginRepository
{
    // F-AUTH-01 Login + selección de sistema
    Task<IReadOnlyList<object>> GetSistemasByCorreoAsync(string correo, CancellationToken cancellationToken);
    Task<object?> LoginAsync(string correo, string pass, int idSistema, CancellationToken cancellationToken);

    // F-AUTH-01b Cambio de sistema activo sin re-loguearse (requiere token válido)
    Task<SwitchSistemaRepositoryResult> SwitchSistemaAsync(long sisuId, int idSistema, CancellationToken cancellationToken);

    // F-AUTH-02 Logout (dead token)
    Task<object?> LogoutAsync(long sisuId, string token, CancellationToken cancellationToken);

    // F-AUTH-08 Menú por usuario/sistema
    Task<IReadOnlyList<object>> AllSistemasAsync(CancellationToken cancellationToken);
}
