using System.Collections;
using System.Data;
using System.Data.Common;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging.Abstractions;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Sui853.Cdft;
using Veolia.Api.Modules.Sui853.Comercial;
using Veolia.Api.Modules.Sui853.Configuracion;
using Veolia.Api.Modules.Sui853.General;
using Veolia.Api.Modules.Sui853.Operaciones;

namespace Veolia.Api.Tests.Legacy.T4;

/// <summary>
/// SQL text, binds and bind order the SUI853 repositories send to Oracle, compared with the legacy
/// back-tarificador/src/modules/sui853 controllers. Placeholders are normalized (legacy :1/:2, new :name → :?).
/// </summary>
public sealed class LegacyT4RepositorySqlTests
{
    // Legacy configuracion/controller.js:241-262 (tcfgAps): SELECT TCFG_APS_ID, NOMBRE_APS FROM SUI.TCFG_APS ORDER BY NOMBRE_APS.
    [Fact]
    public async Task TcfgAps_RunsTheLegacySelectAndKeepsOracleKeys()
    {
        var db = new T4RecordingConnection(_ => T4Tables.Of(["TCFG_APS_ID", "NOMBRE_APS"], [5m, "APS Centro"]));

        var rows = await new Sui853ReadmodelsRepository(new T4Factory(db)).GetTcfgApsAsync(default);

        var command = Assert.Single(db.Commands);
        Assert.Equal("SELECT TCFG_APS_ID, NOMBRE_APS FROM SUI.TCFG_APS ORDER BY NOMBRE_APS", T4Sql.Normalize(command.CommandText));
        Assert.Empty(command.Parameters);
        var row = Assert.IsAssignableFrom<IDictionary<string, object>>(Assert.Single(rows));
        Assert.Equal(["TCFG_APS_ID", "NOMBRE_APS"], row.Keys);
        Assert.Equal("APS Centro", row["NOMBRE_APS"]);
    }

    // Legacy CVNA/controller.js:468-476: SELECT ANNO_FISCAL, APS, CDFT_CORRIENTES, CDFT_2018, QRTZ FROM SUI.TCDFT_QRT_ANUAL
    // WHERE ANNO_FISCAL = :1 with the requested year as the only bind (ANNO_FISCAL is VARCHAR2 → bound as text).
    [Fact]
    public async Task Cdft_FiltersTcdftQrtAnualByTheFiscalYear()
    {
        var db = new T4RecordingConnection(_ => T4Tables.Of(["AnnoFiscal", "NombreAps", "ValorCorriente", "Valor2018", "Qrtz"],
            ["2024", "APS Norte", 1.5m, 2.25m, 0.75m]));

        var rows = await new CdftRepository(new T4Factory(db)).GetByAnnoAsync(2024, default);

        var command = Assert.Single(db.Commands);
        var sql = T4Sql.Normalize(command.CommandText);
        Assert.Contains("FROM SUI.TCDFT_QRT_ANUAL WHERE ANNO_FISCAL = :?", sql);
        foreach (var source in new[] { "ANNO_FISCAL", "APS", "CDFT_CORRIENTES", "CDFT_2018", "QRTZ" })
            Assert.Matches($@"\b{source}\b", sql);
        Assert.Equal(new object?[] { "2024" }, command.Parameters.Select(p => p.Value).ToArray());
        var row = Assert.Single(rows);
        Assert.Equal(("2024", "APS Norte", 1.5m, 2.25m, 0.75m), (row.AnnoFiscal, row.NombreAps, row.ValorCorriente, row.Valor2018, row.Qrtz));
    }

    // Legacy CVNA/controller.js:470-472 returns CDFT_CORRIENTES, CDFT_2018 and QRTZ unrounded (full Oracle NUMBER).
    [Fact(Skip = "PARITY-FINDING: CdftRepository casts CDFT_CORRIENTES, CDFT_2018 and QRTZ to NUMBER(18,6): values with more than 6 decimals are rounded in Oracle; legacy returned the column values as stored (copy/export use the raw value).")]
    public async Task Cdft_ReturnsValuesWithoutRounding()
    {
        var db = new T4RecordingConnection(_ => T4Tables.Of(["AnnoFiscal", "NombreAps", "ValorCorriente", "Valor2018", "Qrtz"],
            ["2024", "APS Norte", 1m, 1m, 1m]));

        await new CdftRepository(new T4Factory(db)).GetByAnnoAsync(2024, default);

        Assert.DoesNotContain("CAST(", Assert.Single(db.Commands).CommandText);
    }

    // Legacy operaciones/controller.js:6-18: the 21 TGEN_RESGENERADOS columns, filtered APS = :1 AND ANNO = :2 AND MES = :3.
    [Fact]
    public async Task ResiduosGenerados_RunsTheLegacySelectWithApsYearMonthBinds()
    {
        var db = new T4RecordingConnection(_ => T4Tables.Of(["APS", "TON_RBU"], ["5", 1.25m]));
        var repository = new ResiduosGeneradosRepository(new T4Factory(db), new ComercialRepository(new T4Factory(db)));

        var rows = await repository.GetDetailAsync(new ResiduosGeneradosRequest("5", 2024, 3), default);

        var command = Assert.Single(db.Commands);
        Assert.Equal(
            "SELECT APS, NOMAPS, ANNO, MES, NUAP, TIP_SITIO, NRO_SITIO, PLACA, FEC_ENTRADA, HOR_ENTRADA, HOR_SALIDA, NUM_MICRO, " +
            "TON_RBU, TON_RBR, TON_RSOU, TON_RSOR, SIS_MEDICION, TON_APROVE, VLR_PEAJES, FEC_REGIST, USU_REG " +
            "FROM SUI.TGEN_RESGENERADOS WHERE APS = :? AND ANNO = :? AND MES = :?",
            T4Sql.Normalize(command.CommandText));
        Assert.Equal(new object?[] { "5", 2024, 3 }, command.Parameters.Select(p => p.Value).ToArray());
        var row = Assert.Single(rows);
        Assert.Equal(["APS", "TON_RBU"], row.Keys);
    }

    // Legacy operaciones/controller.js:31-41: SELECT * FROM SUI.TGEN_COMERCIAL where APS = :1 AND ANNO = :2 AND MES = :3.
    [Fact]
    public async Task ComercialDetalle_RunsTheLegacySelectWithApsYearMonthBinds()
    {
        var db = new T4RecordingConnection(_ => T4Tables.Of(["APS", "MUNI"], ["9", "5001"]));

        var rows = await new ComercialRepository(new T4Factory(db)).GetDetailAsync(new ComercialRequest("9", 2023, 12), default);

        var command = Assert.Single(db.Commands);
        Assert.Equal("SELECT * FROM SUI.TGEN_COMERCIAL WHERE APS = :? AND ANNO = :? AND MES = :?", T4Sql.Normalize(command.CommandText));
        Assert.Equal(new object?[] { "9", 2023, 12 }, command.Parameters.Select(p => p.Value).ToArray());
        Assert.Equal("5001", Assert.Single(rows)["MUNI"]);
    }

    // Legacy operaciones/controller.js:53-99 (resumenResiduosGenerados → "F853GR02") and General/controller.js:7-56
    // (fac → "F853GR01"): SUI.f_render_formato2(:1) then the TCAT_DOCUMENTO title "CODIGO | NOMBRE | DESCRIPCION"
    // bound with the same code, written to meta.dialogHeader; a double-encoded payload is parsed twice.
    [Fact]
    public async Task ComercialResumen_RendersF853GR02AndItsCatalogTitle()
    {
        var db = new T4RecordingConnection(command => command.CommandText.Contains("f_render_formato2")
            ? T4Tables.Of(["JSON"], [JsonSerializer.Serialize("""{"title":"R","data":[{"X":1}]}""")])
            : T4Tables.Of(["TITULO"], ["F853GR02 | Resumen | Residuos"]));

        var payload = await new ComercialRepository(new T4Factory(db)).GetSummaryAsync(default);

        AssertFormato2Commands(db.Commands.Select(c => (c.CommandText, c.Parameters.Select(p => p.Value).ToArray())).ToList(), "F853GR02");
        Assert.Equal("F853GR02 | Resumen | Residuos", payload!["meta"]!["dialogHeader"]!.GetValue<string>());
        Assert.Equal("R", payload["title"]!.GetValue<string>());
    }

    [Fact]
    public async Task Fac_RendersF853GR01AndItsCatalogTitle()
    {
        var db = new T4RecordingConnection(command => command.CommandText.Contains("f_render_formato2")
            ? T4Tables.Of(["JSON"], ["""{"title":"FAC","meta":{"other":1},"data":[]}"""])
            : T4Tables.Of(["TITULO"], ["F853GR01 | FAC | General"]));

        var payload = await new FacRepository(new T4Factory(db), NullLogger<FacRepository>.Instance).GetAsync(default);

        AssertFormato2Commands(db.Commands.Select(c => (c.CommandText, c.Parameters.Select(p => p.Value).ToArray())).ToList(), "F853GR01");
        Assert.Equal("F853GR01 | FAC | General", payload["meta"]!["dialogHeader"]!.GetValue<string>());
        Assert.Equal(1, payload["meta"]!["other"]!.GetValue<int>());
    }

    // Legacy configuracion/controller.js:160-165: SELECT of the 14 SUI.CFG_COLUMNA columns, no binds.
    [Fact]
    public async Task GetFormularios_SelectsTheFourteenCfgColumnaColumns()
    {
        var db = new T4RecordingConnection(_ => FormularioTable("Valor"));

        var rows = await new FormulariosRepository(new T4Factory(db)).ListAsync(default);

        var command = Assert.Single(db.Commands);
        Assert.StartsWith(
            "SELECT FORMATO, SECCION, FIELD, HEADER_TXT, BACKGROUND_COLOR, FILTER_FLAG, FORMATO_DATO, DECIMALES, ALINEACION, " +
            "TOOLTIP, MOSTRAR_HEADER, INCLUIR_DATA, ORDEN_HEADER, ORDEN_DATA FROM SUI.CFG_COLUMNA",
            T4Sql.Normalize(command.CommandText));
        Assert.Empty(command.Parameters);
        Assert.Equal("Valor", Assert.Single(rows).HEADER_TXT);
    }

    // Legacy configuracion/controller.js:96-145: UPDATE SUI.CFG_COLUMNA SET the 11 editable columns WHERE FORMATO/SECCION/FIELD,
    // binds in that order, then re-reads the row by FORMATO, SECCION, FIELD.
    [Fact]
    public async Task UpdateFormulario_RunsTheLegacyUpdateAndRereadsTheRow()
    {
        var db = new T4RecordingConnection(command => command.CommandText.TrimStart().StartsWith("UPDATE", StringComparison.Ordinal)
            ? 1 : FormularioTable("Nuevo"));
        var row = new FormularioRow
        {
            FORMATO = "F853S105", SECCION = "SIN_MOVIMIENTO", FIELD = "VALOR", HEADER_TXT = "Nuevo", BACKGROUND_COLOR = "R",
            FILTER_FLAG = "N", FORMATO_DATO = "numero", DECIMALES = 3, ALINEACION = "der", TOOLTIP = "Ayuda",
            MOSTRAR_HEADER = "S", INCLUIR_DATA = "N", ORDEN_HEADER = 4, ORDEN_DATA = 5
        };

        var saved = await new FormulariosRepository(new T4Factory(db)).UpdateAsync(row, default);

        Assert.Equal(2, db.Commands.Count);
        Assert.Equal(
            "UPDATE SUI.CFG_COLUMNA SET HEADER_TXT = :?, BACKGROUND_COLOR = :?, FILTER_FLAG = :?, FORMATO_DATO = :?, DECIMALES = :?, " +
            "ALINEACION = :?, TOOLTIP = :?, MOSTRAR_HEADER = :?, INCLUIR_DATA = :?, ORDEN_HEADER = :?, ORDEN_DATA = :? " +
            "WHERE FORMATO = :? AND SECCION = :? AND FIELD = :?",
            T4Sql.Normalize(db.Commands[0].CommandText));
        Assert.Equal(new object?[] { "Nuevo", "R", "N", "numero", 3, "der", "Ayuda", "S", "N", 4, 5, "F853S105", "SIN_MOVIMIENTO", "VALOR" },
            db.Commands[0].Parameters.Select(p => p.Value).ToArray());
        Assert.EndsWith("FROM SUI.CFG_COLUMNA WHERE FORMATO = :? AND SECCION = :? AND FIELD = :?", T4Sql.Normalize(db.Commands[1].CommandText));
        Assert.Equal(new object?[] { "F853S105", "SIN_MOVIMIENTO", "VALOR" }, db.Commands[1].Parameters.Select(p => p.Value).ToArray());
        Assert.Equal("Nuevo", saved!.HEADER_TXT);
        Assert.True(db.Committed);
    }

    // Legacy configuracion/controller.js:218-224 (tablasSui): ALL_TABLES WHERE OWNER = 'SUI'.
    [Fact]
    public async Task TablasSui_ReadsAllTablesOfTheSuiOwner()
    {
        var db = new T4RecordingConnection(_ => T4Tables.Of(["TABLE_NAME"], ["TGEN_A"]));

        var tables = await new CargaGenericaRepository(new T4Factory(db)).TablesAsync(default);

        var sql = T4Sql.Normalize(Assert.Single(db.Commands).CommandText);
        Assert.Contains("FROM ALL_TABLES WHERE OWNER = 'SUI'", sql);
        Assert.Equal(["TGEN_A"], tables);
    }

    // Legacy configuracion/controller.js:1093-1099 (ALL_TAB_COLUMNS ordered by COLUMN_ID for the table) and
    // 1232-1234 + 1290-1296 (INSERT INTO OWNER.TABLE (cols) VALUES (:1..:n), one bind per selected column in order).
    // Intentional (parity-review-all T8): SUI-only owner and a single transaction for the whole load.
    [Fact]
    public async Task CargaInsert_ReadsTableColumnsThenInsertsEachRowInColumnOrder()
    {
        var db = new T4RecordingConnection(command => command.CommandText.Contains("ALL_TAB_COLUMNS")
            ? T4Tables.Of(["COLUMN_NAME", "DATA_TYPE", "COLUMN_ID"], ["ID", "NUMBER", 1m], ["VALOR", "NUMBER", 2m])
            : 1);
        CargaColumn[] columns = [new("VALOR", "NUMBER", 2), new("ID", "NUMBER", 1)];

        var inserted = await new CargaGenericaRepository(new T4Factory(db)).InsertAsync("TGEN_A", columns,
            [new object?[] { 12.5m, 1m }, new object?[] { null, 2m }], default);

        Assert.Equal(3, db.Commands.Count);
        var columnsSql = T4Sql.Normalize(db.Commands[0].CommandText);
        Assert.StartsWith("SELECT COLUMN_NAME, DATA_TYPE, COLUMN_ID FROM ALL_TAB_COLUMNS", columnsSql);
        Assert.Contains("TABLE_NAME = :?", columnsSql);
        Assert.EndsWith("ORDER BY COLUMN_ID", columnsSql);
        Assert.Equal(new object?[] { "TGEN_A" }, db.Commands[0].Parameters.Select(p => p.Value).ToArray());
        Assert.Equal("INSERT INTO SUI.TGEN_A (VALOR, ID) VALUES (:?, :?)", T4Sql.Normalize(db.Commands[1].CommandText));
        Assert.Equal(new object?[] { 12.5m, 1m }, db.Commands[1].Parameters.Select(p => p.Value).ToArray());
        Assert.Equal(new object?[] { null, 2m }, db.Commands[2].Parameters.Select(p => p.Value is DBNull ? null : p.Value).ToArray());
        Assert.Equal(2, inserted);
        Assert.True(db.Committed);
    }

    // Legacy configuracion/controller.js:36-39: TRUNCATE TABLE OWNER.TABLE (no binds).
    [Fact]
    public async Task CargaTruncate_RunsTruncateTableOnTheSuiTable()
    {
        var db = new T4RecordingConnection(command => command.CommandText.Contains("ALL_TAB_COLUMNS")
            ? T4Tables.Of(["COLUMN_NAME", "DATA_TYPE", "COLUMN_ID"], ["ID", "NUMBER", 1m])
            : 0);

        await new CargaGenericaRepository(new T4Factory(db)).TruncateAsync("TGEN_A", default);

        Assert.Equal("TRUNCATE TABLE SUI.TGEN_A", T4Sql.Normalize(db.Commands[^1].CommandText));
        Assert.Empty(db.Commands[^1].Parameters);
    }

    private static void AssertFormato2Commands(List<(string Sql, object?[] Values)> commands, string code)
    {
        Assert.Equal(2, commands.Count);
        Assert.Equal("SELECT SUI.F_RENDER_FORMATO2(:?) AS JSON FROM DUAL", T4Sql.Normalize(commands[0].Sql).ToUpperInvariant());
        Assert.Equal(new object?[] { code }, commands[0].Values);
        var title = T4Sql.Normalize(commands[1].Sql).Replace(" ", "");
        Assert.StartsWith("SELECTtd.CODIGO||'|'||td.NOMBRE||'|'||td.DESCRIPCION", title);
        Assert.EndsWith("FROMsui.TCAT_DOCUMENTOtdWHEREtd.CODIGO=:?", title);
        Assert.Equal(new object?[] { code }, commands[1].Values);
    }

    private static DataTable FormularioTable(string header) => T4Tables.Of(
        ["FORMATO", "SECCION", "FIELD", "HEADER_TXT", "BACKGROUND_COLOR", "FILTER_FLAG", "FORMATO_DATO", "DECIMALES", "ALINEACION",
         "TOOLTIP", "MOSTRAR_HEADER", "INCLUIR_DATA", "ORDEN_HEADER", "ORDEN_DATA"],
        ["F853S105", "SIN_MOVIMIENTO", "VALOR", header, "R", "N", "numero", 3, "der", "Ayuda", "S", "N", 4, 5]);
}

file static class T4Sql
{
    // Collapse whitespace, drop spaces before commas and replace bind names (:1, :aps, :p0) with ":?".
    public static string Normalize(string sql)
    {
        var text = Regex.Replace(sql, @"\s+", " ").Trim();
        text = Regex.Replace(text, @"\s*,\s*", ", ");
        text = Regex.Replace(text, @"(?<![A-Za-z0-9_']):[A-Za-z0-9_]+", ":?");
        return Regex.Replace(text, @"\bwhere\b", "WHERE");
    }
}

file static class T4Tables
{
    public static DataTable Of(string[] columns, params object?[][] rows)
    {
        var table = new DataTable();
        for (var i = 0; i < columns.Length; i++)
            table.Columns.Add(columns[i], rows.Select(r => r[i]).FirstOrDefault(v => v is not null)?.GetType() ?? typeof(object));
        foreach (var row in rows) table.Rows.Add(row.Select(v => v ?? DBNull.Value).ToArray());
        return table;
    }
}

file sealed class T4Factory(T4RecordingConnection connection) : IOracleConnectionFactory
{
    public IDbConnection CreateConnection() => connection;
}

file sealed class T4RecordedCommand(string commandText, IReadOnlyList<DbParameter> parameters)
{
    public string CommandText { get; } = commandText;
    public IReadOnlyList<DbParameter> Parameters { get; } = parameters;
}

/// <summary>Records every command and answers it with <c>respond</c> (DataTable for readers/scalars, int for non-queries).</summary>
file sealed class T4RecordingConnection(Func<T4RecordedCommand, object?> respond) : DbConnection
{
    private ConnectionState state = ConnectionState.Closed;

    public List<T4RecordedCommand> Commands { get; } = [];
    public bool Committed { get; set; }

    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string ConnectionString { get; set; } = string.Empty;
    public override string Database => "recording";
    public override string DataSource => "recording";
    public override string ServerVersion => "1";
    public override ConnectionState State => state;

    public override void ChangeDatabase(string databaseName) { }
    public override void Close() => state = ConnectionState.Closed;
    public override void Open() => state = ConnectionState.Open;

    protected override DbTransaction BeginDbTransaction(IsolationLevel isolationLevel) => new T4Transaction(this);
    protected override DbCommand CreateDbCommand() => new T4Command(this);

    internal object? Execute(T4Command command)
    {
        var recorded = new T4RecordedCommand(command.CommandText, command.Items.ToList());
        Commands.Add(recorded);
        return respond(recorded);
    }

    private sealed class T4Transaction(T4RecordingConnection owner) : DbTransaction
    {
        private bool done;
        public override IsolationLevel IsolationLevel => IsolationLevel.ReadCommitted;
        protected override DbConnection? DbConnection => done ? null : owner;
        public override void Commit() { owner.Committed = true; done = true; }
        public override void Rollback() => done = true;
    }
}

file sealed class T4Command(T4RecordingConnection owner) : DbCommand
{
    private readonly T4Parameters parameters = new();

    internal IEnumerable<DbParameter> Items => parameters.Items;

    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string CommandText { get; set; } = string.Empty;
    public override int CommandTimeout { get; set; }
    public override CommandType CommandType { get; set; } = CommandType.Text;
    public override bool DesignTimeVisible { get; set; }
    public override UpdateRowSource UpdatedRowSource { get; set; }
    protected override DbConnection? DbConnection { get; set; }
    protected override DbParameterCollection DbParameterCollection => parameters;
    protected override DbTransaction? DbTransaction { get; set; }

    public override void Cancel() { }
    public override void Prepare() { }
    protected override DbParameter CreateDbParameter() => new T4Parameter();
    public override int ExecuteNonQuery() => owner.Execute(this) is int rows ? rows : 0;

    public override object? ExecuteScalar()
    {
        var result = owner.Execute(this);
        return result is DataTable table ? (table.Rows.Count == 0 ? null : table.Rows[0][0]) : result;
    }

    protected override DbDataReader ExecuteDbDataReader(CommandBehavior behavior)
        => (owner.Execute(this) as DataTable ?? new DataTable()).CreateDataReader();
}

file sealed class T4Parameter : DbParameter
{
    public override DbType DbType { get; set; } = DbType.Object;
    public override ParameterDirection Direction { get; set; } = ParameterDirection.Input;
    public override bool IsNullable { get; set; }
    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string ParameterName { get; set; } = string.Empty;
    public override int Size { get; set; }
    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string SourceColumn { get; set; } = string.Empty;
    public override bool SourceColumnNullMapping { get; set; }
    public override object? Value { get; set; }
    public override void ResetDbType() => DbType = DbType.Object;
}

file sealed class T4Parameters : DbParameterCollection
{
    internal List<DbParameter> Items { get; } = [];

    public override int Count => Items.Count;
    public override object SyncRoot => Items;
    public override int Add(object value) { Items.Add((DbParameter)value); return Items.Count - 1; }
    public override void AddRange(Array values) { foreach (var value in values) Add(value); }
    public override void Clear() => Items.Clear();
    public override bool Contains(object value) => Items.Contains((DbParameter)value);
    public override bool Contains(string value) => IndexOf(value) >= 0;
    public override void CopyTo(Array array, int index) => ((ICollection)Items).CopyTo(array, index);
    public override IEnumerator GetEnumerator() => Items.GetEnumerator();
    public override int IndexOf(object value) => Items.IndexOf((DbParameter)value);
    public override int IndexOf(string parameterName) => Items.FindIndex(p => p.ParameterName == parameterName);
    public override void Insert(int index, object value) => Items.Insert(index, (DbParameter)value);
    public override void Remove(object value) => Items.Remove((DbParameter)value);
    public override void RemoveAt(int index) => Items.RemoveAt(index);
    public override void RemoveAt(string parameterName) => Items.RemoveAt(IndexOf(parameterName));
    protected override DbParameter GetParameter(int index) => Items[index];
    protected override DbParameter GetParameter(string parameterName) => Items[IndexOf(parameterName)];
    protected override void SetParameter(int index, DbParameter value) => Items[index] = value;
    protected override void SetParameter(string parameterName, DbParameter value) => Items[IndexOf(parameterName)] = value;
}
