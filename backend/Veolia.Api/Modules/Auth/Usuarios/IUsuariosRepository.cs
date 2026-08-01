namespace Veolia.Api.Modules.Auth.Usuarios;

public interface IUsuariosRepository
{
    // F-AUTH-04 Cambio de clave
    Task<(int Status, string Response, string Msg)> SetChangePassAsync(long sisuId, string oldPass, string newPass, string confirmPass, CancellationToken cancellationToken);

    // F-AUTH-05 CRUD usuarios + reset
    Task<IReadOnlyList<object>> GetAllUsersAsync(CancellationToken cancellationToken);
    Task<UserMutationRepositoryResult> RegistroAsync(string nombre, string apellido, string correo, string password, int estado, CancellationToken cancellationToken);
    Task<UserMutationRepositoryResult> UpdateUsuarioAsync(long id, string nombre, string apellido, string correo, int estado, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetUserByIdAsync(long id, CancellationToken cancellationToken);
    Task<string> ResetPassAsync(long id, CancellationToken cancellationToken);
}
