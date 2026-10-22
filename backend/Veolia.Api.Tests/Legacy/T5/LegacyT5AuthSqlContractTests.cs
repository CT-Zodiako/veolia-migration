using System.Data;
using System.Data.Common;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Auth.Login;
using Veolia.Api.Modules.Auth.Menu;
using Veolia.Api.Modules.Auth.Usuarios;

namespace Veolia.Api.Tests.Legacy.T5;

/// <summary>
/// SQL behind /api/v1/auth (usuarios, menú, logout, sistemas) against legacy back-tarificador/src/modules/auth/controller.js.
/// The HTTP contract and authorization of the 22 routes are covered by AuthContractSmokeTests/AuthAuthorizationContractTests;
/// this file pins what reaches Oracle. Recorded deviations: R3 getGeneralMenuTree filtered by system, SISU_PASS no longer
/// returned and SISU_NOMBRES/SISU_APELLIDOS aliased SISU_NOMBRE/SISU_APELLIDO as the new screens read them (parity-review-all T13/L19).
/// </summary>
public sealed class LegacyT5AuthSqlContractTests
{
    // Legacy controller.js:220-224: SELECT * FROM AUGE_SISUSUARIO ORDER BY SISU_APELLIDOS ASC.
    [Fact]
    public async Task GetAllUsersSql_ReadsAugeSisusuarioOrderedBySurname()
    {
        var db = new T5AuthRecConnection();

        await new UsuariosRepository(new T5AuthRecFactory(db)).GetAllUsersAsync(default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.Contains("FROM AUGE_SISUSUARIO ORDER BY SISU_APELLIDOS", sql);
        foreach (var column in new[] { "SISU_ID", "SISU_NOMBRES AS SISU_NOMBRE", "SISU_APELLIDOS AS SISU_APELLIDO", "SISU_CORREO", "SISU_ESTADO" })
            Assert.Contains(column, sql);
        Assert.Empty(binds);
    }

    // Legacy routes.js:114-118 reads { id }; controller.js:227: SELECT * FROM AUGE_SISUSUARIO WHERE SISU_ID = :1.
    [Fact]
    public async Task GetUserByIdSql_FiltersBySisuId()
    {
        var db = new T5AuthRecConnection();

        await new UsuariosRepository(new T5AuthRecFactory(db)).GetUserByIdAsync(44, default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.Matches(@"FROM AUGE_SISUSUARIO WHERE SISU_ID = :\w+$", sql);
        Assert.Equal(new object?[] { 44L }, binds.Values.ToArray());
    }

    // Legacy controller.js:233-238: UPDATE AUGE_SISUSUARIO SET SISU_NOMBRES, SISU_APELLIDOS, SISU_CORREO, SISU_ESTADO WHERE SISU_ID.
    [Fact]
    public async Task UpdateUsuarioSql_UpdatesTheFourLegacyColumns()
    {
        var db = new T5AuthRecConnection();

        await new UsuariosRepository(new T5AuthRecFactory(db)).UpdateUsuarioAsync(44, "Ada", "Lovelace", "ada@veolia.com", 0, default);

        var (sql, binds) = db.Commands[^1];
        Assert.Matches(@"^UPDATE AUGE_SISUSUARIO SET SISU_NOMBRES = :\w+, SISU_APELLIDOS = :\w+, SISU_CORREO = :\w+, SISU_ESTADO = :\w+ WHERE SISU_ID = :\w+$", sql);
        Assert.Equal(("Ada", "Lovelace", "ada@veolia.com", 0, 44L),
            ((string)binds["nombre"]!, (string)binds["apellido"]!, (string)binds["correo"]!, (int)binds["estado"]!, (long)binds["id"]!));
    }

    // Legacy controller.js:242-250: new password bcrypt-hashed into SISU_PASS of the user; the clear password is returned.
    [Fact]
    public async Task ResetPassSql_StoresTheBcryptHashOfTheReturnedPassword()
    {
        var db = new T5AuthRecConnection();

        var newPass = await new UsuariosRepository(new T5AuthRecFactory(db)).ResetPassAsync(44, default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.Matches(@"^UPDATE AUGE_SISUSUARIO SET SISU_PASS = :\w+ WHERE SISU_ID = :\w+$", sql);
        Assert.Equal(44L, binds["id"]);
        Assert.True(BCrypt.Net.BCrypt.Verify(newPass, (string)binds["newPass"]!));
    }

    // Legacy helpers/authhelper.js:17-20: the reset password is 6 lowercase hex characters (shown to the admin).
    [Fact(Skip = "PARITY-FINDING: resetPass returns a 10-character mixed-case alphanumeric password (UsuariosRepository.GeneratePassword); legacy returned 6 lowercase hex characters (authhelper.js:17-20). Visible to the admin who reads it out; low severity, stronger than legacy. Not recorded in parity-review-all.")]
    public async Task ResetPass_ReturnsSixHexCharactersLikeLegacy()
    {
        var newPass = await new UsuariosRepository(new T5AuthRecFactory(new T5AuthRecConnection())).ResetPassAsync(44, default);

        Assert.Matches("^[0-9a-f]{6}$", newPass);
    }

    // Legacy controller.js:127-139: a.MENU_ID of AUGE_USUAMENU joined to AUGE_MENU of the system, user's active options of active menus.
    [Fact]
    public async Task GetUserMenuSql_FiltersUserSystemAndActiveStates()
    {
        var db = new T5AuthRecConnection();

        await new MenuRepository(new T5AuthRecFactory(db)).GetUserMenuAsync(101, 1, default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.Matches(@"^SELECT um\.MENU_ID FROM AUGE_USUAMENU um INNER JOIN AUGE_MENU m ON m\.MENU_ID = um\.MENU_ID", sql);
        foreach (var filter in new[] { "um.SISU_ID = :sisuId", "um.USME_ESTADO = 1", "m.MENU_ESTADO = 1", "m.MENU_SISTEMA = :idSistema" })
            Assert.Contains(filter, sql);
        Assert.EndsWith("ORDER BY um.MENU_ID", sql);
        Assert.Equal((101L, 1), ((long)binds["sisuId"]!, (int)binds["idSistema"]!));
    }

    // Legacy controller.js:273-285: MENU_ID of AUGE_USUAMENU WHERE USME_ESTADO = 1 AND SISU_ID = :1 ORDER BY 1.
    [Fact]
    public async Task GetMenuUserOptionsSql_ReturnsTheActiveOptionsOfTheUser()
    {
        var db = new T5AuthRecConnection();

        await new MenuRepository(new T5AuthRecFactory(db)).GetMenuUserOptionsAsync(44, default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.Contains("FROM AUGE_USUAMENU um", sql);
        Assert.Contains("um.SISU_ID = :id", sql);
        Assert.Contains("um.USME_ESTADO = 1", sql);
        Assert.EndsWith("ORDER BY um.MENU_ID", sql);
        Assert.Equal(new object?[] { 44L }, binds.Values.ToArray());
    }

    // Legacy controller.js:289-323: disable every AUGE_USUAMENU row of the user in the system (MENU_SISTEMA = :2), then each
    // selected option is re-enabled (USME_ESTADO = 1) or inserted with SAUGE_USUAMENU.NEXTVAL.
    [Fact]
    public async Task UptUserMenuSql_DisablesTheSystemThenEnablesOrInsertsEachOption()
    {
        var db = new T5AuthRecConnection();

        await new MenuRepository(new T5AuthRecFactory(db)).UptUserMenuAsync(44, [11, 22, 11], 1, default);

        Assert.Equal(3, db.Commands.Count);
        var (disable, disableBinds) = db.Commands[0];
        Assert.Matches(@"^UPDATE AUGE_USUAMENU SET USME_ESTADO = 0 WHERE SISU_ID = :id AND MENU_ID IN \( SELECT MENU_ID FROM AUGE_MENU WHERE MENU_SISTEMA = :sistema \)$", disable);
        Assert.Equal((44L, 1), ((long)disableBinds["id"]!, (int)disableBinds["sistema"]!));
        foreach (var (merge, binds) in db.Commands.Skip(1))
        {
            Assert.Contains("UPDATE SET t.USME_ESTADO = 1", merge);
            Assert.Contains("VALUES (SAUGE_USUAMENU.NEXTVAL, src.SISU_ID, src.MENU_ID, 1)", merge);
            Assert.Equal(44L, binds["id"]);
        }
        Assert.Equal(new object?[] { 11L, 22L }, db.Commands.Skip(1).Select(c => c.Binds["menuId"]).ToArray());
    }

    // Legacy controller.js:326-357: active AUGE_MENU rows ORDER BY MENU_ID turned into [{ id, label, children: [{ id, label }] }].
    [Fact]
    public async Task GeneralMenuTree_BuildsTheLegacyIdLabelChildrenTree()
    {
        var table = new DataTable();
        table.Columns.Add("MENU_ID", typeof(long));
        table.Columns.Add("MENU_NOMBRE", typeof(string));
        table.Columns.Add("MENU_PADRE", typeof(long));
        table.Rows.Add(200L, "Configuración", DBNull.Value);
        table.Rows.Add(204L, "Usuarios", 200L);
        var db = new T5AuthRecConnection { Result = table };

        var tree = await new MenuRepository(new T5AuthRecFactory(db)).GetGeneralMenuTreeAsync(101, 1, default);

        var (sql, _) = Assert.Single(db.Commands);
        Assert.Matches(@"^SELECT MENU_ID, MENU_NOMBRE, MENU_PADRE FROM AUGE_MENU WHERE MENU_ESTADO = 1 AND MENU_SISTEMA = :idSistema ORDER BY MENU_ID$", sql);
        var json = JsonSerializer.SerializeToElement(tree);
        Assert.Equal(1, json.GetArrayLength());
        Assert.Equal((200, "Configuración"), (json[0].GetProperty("id").GetInt64(), json[0].GetProperty("label").GetString()));
        var child = Assert.Single(json[0].GetProperty("children").EnumerateArray());
        Assert.Equal((204, "Usuarios"), (child.GetProperty("id").GetInt64(), child.GetProperty("label").GetString()));
    }

    // Legacy routes.js:70-76 + controller.js:121-124: INSERT INTO AUGE_DEADTOKEN VALUES (SAUGE_DEADTOKEN.NEXTVAL, :token, :usuario, sysdate).
    [Fact]
    public async Task LogoutSql_InsertsTheDeadToken()
    {
        var db = new T5AuthRecConnection();

        await new LoginRepository(new T5AuthRecFactory(db), new ConfigurationBuilder().Build()).LogoutAsync(101, "tok", default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.Equal("INSERT INTO AUGE_DEADTOKEN VALUES (SAUGE_DEADTOKEN.NEXTVAL, :token, :sisuId, SYSDATE)", sql);
        Assert.Equal(("tok", 101L), ((string)binds["token"]!, (long)binds["sisuId"]!));
    }

    // Legacy controller.js:28-29: SELECT SIST_ID, SIST_NOMBRE FROM AUGE_SISTEMA WHERE SIST_ESTADO = 1.
    [Fact]
    public async Task AllSistemasSql_ListsActiveSystems()
    {
        var db = new T5AuthRecConnection();

        await new LoginRepository(new T5AuthRecFactory(db), new ConfigurationBuilder().Build()).AllSistemasAsync(default);

        var (sql, binds) = Assert.Single(db.Commands);
        Assert.StartsWith("SELECT SIST_ID, SIST_NOMBRE FROM AUGE_SISTEMA WHERE SIST_ESTADO = 1", sql);
        Assert.Empty(binds);
    }
}

file sealed class T5AuthRecFactory(T5AuthRecConnection connection) : IOracleConnectionFactory
{
    public IDbConnection CreateConnection() => connection;
}

/// <summary>Records SQL (whitespace-collapsed) and named binds; queries return <see cref="Result"/> (empty by default).</summary>
file sealed class T5AuthRecConnection : DbConnection
{
    private ConnectionState state = ConnectionState.Closed;
    internal List<(string Sql, Dictionary<string, object?> Binds)> Commands { get; } = [];
    internal DataTable Result { get; set; } = new();

    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string ConnectionString { get; set; } = string.Empty;
    public override string Database => "t5";
    public override string DataSource => "t5";
    public override string ServerVersion => "1";
    public override ConnectionState State => state;
    public override void ChangeDatabase(string databaseName) { }
    public override void Close() => state = ConnectionState.Closed;
    public override void Open() => state = ConnectionState.Open;
    protected override DbTransaction BeginDbTransaction(IsolationLevel isolationLevel) => throw new NotSupportedException();
    protected override DbCommand CreateDbCommand() => new T5AuthRecCommand(this);

    internal void Record(DbCommand command)
        => Commands.Add((Regex.Replace(command.CommandText, @"\s+", " ").Trim(),
            command.Parameters.Cast<DbParameter>().ToDictionary(p => p.ParameterName, p => p.Value is DBNull ? null : p.Value)));
}

file sealed class T5AuthRecCommand(T5AuthRecConnection owner) : DbCommand
{
    private readonly SqliteCommand inner = new();

    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string CommandText { get; set; } = string.Empty;
    public override int CommandTimeout { get; set; }
    public override CommandType CommandType { get; set; }
    public override bool DesignTimeVisible { get; set; }
    public override UpdateRowSource UpdatedRowSource { get; set; }
    protected override DbConnection? DbConnection { get; set; }
    protected override DbParameterCollection DbParameterCollection => inner.Parameters;
    protected override DbTransaction? DbTransaction { get; set; }
    public override void Cancel() { }
    public override void Prepare() { }
    protected override DbParameter CreateDbParameter() => inner.CreateParameter();

    public override int ExecuteNonQuery()
    {
        owner.Record(this);
        return 1;
    }

    public override object? ExecuteScalar()
    {
        owner.Record(this);
        return null;
    }

    protected override DbDataReader ExecuteDbDataReader(CommandBehavior behavior)
    {
        owner.Record(this);
        return owner.Result.CreateDataReader();
    }
}
