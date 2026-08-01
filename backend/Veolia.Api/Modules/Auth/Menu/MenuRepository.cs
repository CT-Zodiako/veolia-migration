using Dapper;
using System.Data.Common;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Auth.Menu;

public class MenuRepository(IOracleConnectionFactory connectionFactory) : IMenuRepository
{
    public async Task<IReadOnlyList<long>> GetUserMenuAsync(long sisuId, int idSistema, CancellationToken cancellationToken)
    {
        const string sql = @"
SELECT um.MENU_ID
FROM AUGE_USUAMENU um
INNER JOIN AUGE_MENU m ON m.MENU_ID = um.MENU_ID
WHERE um.SISU_ID = :sisuId
  AND um.USME_ESTADO = 1
  AND m.MENU_ESTADO = 1
  AND m.MENU_SISTEMA = :idSistema
ORDER BY um.MENU_ID";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<long>(sql, new { sisuId, idSistema });
        return rows.ToList();
    }

    public async Task<IReadOnlyList<object>> GetGeneralMenuTreeAsync(long sisuId, int idSistema, CancellationToken cancellationToken)
    {
        const string sql = @"
SELECT
    MENU_ID,
    MENU_NOMBRE,
    MENU_PADRE
FROM AUGE_MENU
WHERE MENU_ESTADO = 1
  AND MENU_SISTEMA = :idSistema
ORDER BY MENU_ID";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var menuRows = (await connection.QueryAsync(sql, new { idSistema })).ToList();

        var byId = menuRows.ToDictionary(
            row => (long)row.MENU_ID,
            row => new MenuTreeNode((long)row.MENU_ID, (string)row.MENU_NOMBRE, new List<MenuTreeNode>()));

        var roots = new List<MenuTreeNode>();

        foreach (var row in menuRows)
        {
            var current = byId[(long)row.MENU_ID];
            MenuTreeNode? parent = null;
            if (row.MENU_PADRE != null && byId.TryGetValue((long)row.MENU_PADRE, out parent) && parent != null)
            {
                parent.children.Add(current);
                continue;
            }

            roots.Add(current);
        }

        return roots.Select(node => (object)node).ToList();
    }

    public async Task<IReadOnlyList<long>> GetMenuByUserAsync(int idSistema, long sisuId, CancellationToken cancellationToken)
    {
        const string sql = @"
SELECT um.MENU_ID
FROM AUGE_USUAMENU um
INNER JOIN AUGE_MENU m ON m.MENU_ID = um.MENU_ID
WHERE um.SISU_ID = :sisuId
  AND um.USME_ESTADO = 1
  AND m.MENU_ESTADO = 1
  AND m.MENU_SISTEMA = :idSistema
ORDER BY um.MENU_ID";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<long>(sql, new { sisuId, idSistema });
        return rows.ToList();
    }

    public async Task<IReadOnlyList<long>> GetMenuUserOptionsAsync(long id, CancellationToken cancellationToken)
    {
        const string sql = @"
SELECT um.MENU_ID
FROM AUGE_USUAMENU um
INNER JOIN AUGE_MENU m ON m.MENU_ID = um.MENU_ID
WHERE um.SISU_ID = :id
  AND um.USME_ESTADO = 1
  AND m.MENU_ESTADO = 1
ORDER BY um.MENU_ID";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<long>(sql, new { id });
        return rows.ToList();
    }

    public async Task<object?> UptUserMenuAsync(long id, IReadOnlyList<long> options, int sistema, CancellationToken cancellationToken)
    {
        const string disableSql = @"
UPDATE AUGE_USUAMENU
SET USME_ESTADO = 0
WHERE SISU_ID = :id
  AND MENU_ID IN (
      SELECT MENU_ID
      FROM AUGE_MENU
      WHERE MENU_SISTEMA = :sistema
  )";

        const string mergeSelectedSql = @"
MERGE INTO AUGE_USUAMENU t
USING (
    SELECT :id AS SISU_ID, :menuId AS MENU_ID
    FROM DUAL
) src
ON (t.SISU_ID = src.SISU_ID AND t.MENU_ID = src.MENU_ID)
WHEN MATCHED THEN
    UPDATE SET t.USME_ESTADO = 1
WHEN NOT MATCHED THEN
    INSERT (USME_ID, SISU_ID, MENU_ID, USME_ESTADO)
    VALUES (SAUGE_USUAMENU.NEXTVAL, src.SISU_ID, src.MENU_ID, 1)";

        using var connection = await OpenConnectionAsync(cancellationToken);

        var rowsAffected = await connection.ExecuteAsync(
            new CommandDefinition(disableSql, new { id, sistema }, cancellationToken: cancellationToken));

        foreach (var menuId in options.Distinct())
        {
            rowsAffected += await connection.ExecuteAsync(
                new CommandDefinition(mergeSelectedSql, new { id, menuId }, cancellationToken: cancellationToken));
        }

        return new { rowsAffected };
    }

    public async Task<IReadOnlyList<object>> GetMenuCatalogAsync(CancellationToken cancellationToken)
    {
        const string sql = @"
SELECT
    m.MENU_ID,
    m.MENU_NOMBRE,
    m.MENU_PADRE,
    m.MENU_SISTEMA,
    s.SIST_NOMBRE
FROM AUGE_MENU m
LEFT JOIN AUGE_SISTEMA s ON s.SIST_ID = m.MENU_SISTEMA
WHERE m.MENU_ESTADO = 1
ORDER BY m.MENU_SISTEMA, m.MENU_ID";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql);

        return rows.Select(row => (object)new MenuCatalogItem(
                (long)row.MENU_ID,
                (string)row.MENU_NOMBRE,
                row.MENU_PADRE != null ? (long?)row.MENU_PADRE : null,
                (int)row.MENU_SISTEMA,
                row.SIST_NOMBRE != null ? (string)row.SIST_NOMBRE : string.Empty))
            .ToList();
    }

    private async Task<System.Data.IDbConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        var connection = connectionFactory.CreateConnection();

        if (connection is DbConnection dbConnection)
        {
            await dbConnection.OpenAsync(cancellationToken);
        }
        else
        {
            connection.Open();
        }

        return connection;
    }

    private sealed record MenuTreeNode(long id, string label, List<MenuTreeNode> children);

    private sealed record MenuCatalogItem(long id, string label, long? parentId, int sistemaId, string sistemaNombre);
}
