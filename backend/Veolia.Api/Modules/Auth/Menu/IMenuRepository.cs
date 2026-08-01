namespace Veolia.Api.Modules.Auth.Menu;

public interface IMenuRepository
{
    // F-AUTH-03 Menú por permisos
    Task<IReadOnlyList<long>> GetUserMenuAsync(long sisuId, int idSistema, CancellationToken cancellationToken);

    // F-AUTH-08 Menú por usuario/sistema
    Task<IReadOnlyList<object>> GetGeneralMenuTreeAsync(long sisuId, int idSistema, CancellationToken cancellationToken);
    Task<IReadOnlyList<long>> GetMenuByUserAsync(int idSistema, long sisuId, CancellationToken cancellationToken);
    Task<IReadOnlyList<long>> GetMenuUserOptionsAsync(long id, CancellationToken cancellationToken);
    Task<object?> UptUserMenuAsync(long id, IReadOnlyList<long> options, int sistema, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetMenuCatalogAsync(CancellationToken cancellationToken);
}
