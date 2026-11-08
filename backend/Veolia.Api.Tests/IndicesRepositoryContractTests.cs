using System.Collections;
using System.Data;
using System.Data.Common;
using Veolia.Api.Infrastructure.Data;
using Veolia.Api.Modules.Regulator.Indices;

namespace Veolia.Api.Tests;

public sealed class IndicesRepositoryContractTests
{
    // ------------------------------------------------------------------
    // S1: Índices CRA create/edit must open the connection before BeginTransaction().
    // ------------------------------------------------------------------

    [Fact]
    public async Task CrearOpensConnectionBeforeTransactionAndInsertsEveryValor()
    {
        // Scalars: duplicate-period count, then the first created INDI_ID.
        var database = new RecordingConnectionFactory(0, 501L);
        var repository = new IndicesRepository(database);

        var firstId = await repository.CrearAsync(new IndicesCrearRequestDto
        {
            Anno = 2025,
            Mes = 3,
            Valores =
            [
                new IndiceValorDto { Id = 11, Val = 10.5m },
                new IndiceValorDto { Id = 12, Val = 7m }
            ]
        }, usuarioId: 99);

        Assert.Equal(501L, firstId);
        Assert.Equal(
            ["Open", "BeginTransaction", "Execute", "Execute", "Execute", "Execute", "Commit"],
            database.Events);

        Assert.Equal(4, database.Commands.Count);
        Assert.Contains("SELECT COUNT(1)", database.Commands[0].Sql);
        IndicesAssert.AssertParameters(database.Commands[0], ("anno", 2025), ("mes", 3));

        Assert.All(database.Commands.Skip(1).Take(2), c => Assert.StartsWith("INSERT INTO AUCO_INDICESCRA", c.Sql));
        IndicesAssert.AssertParameters(database.Commands[1],
            ("paraId", 11L), ("anno", 2025), ("mes", 3), ("valor", 10.5m), ("mitadValor", 5.25m), ("usuario", 99L));
        IndicesAssert.AssertParameters(database.Commands[2],
            ("paraId", 12L), ("anno", 2025), ("mes", 3), ("valor", 7m), ("mitadValor", 3.5m), ("usuario", 99L));

        Assert.Contains("SELECT MIN(INDI_ID)", database.Commands[3].Sql);
        IndicesAssert.AssertParameters(database.Commands[3], ("anno", 2025), ("mes", 3));
        Assert.All(database.Commands, c => Assert.True(c.HadTransaction, c.Sql));
    }

    [Fact]
    public async Task CrearRejectsDuplicatePeriodWithoutInsertingOrCommitting()
    {
        var database = new RecordingConnectionFactory(1);
        var repository = new IndicesRepository(database);

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => repository.CrearAsync(new IndicesCrearRequestDto
        {
            Anno = 2025,
            Mes = 3,
            Valores = [new IndiceValorDto { Id = 11, Val = 10m }]
        }, usuarioId: 99));

        Assert.Equal("DUPLICATE_PERIOD", error.Message);
        Assert.Equal(["Open", "BeginTransaction", "Execute"], database.Events);
        Assert.DoesNotContain(database.Commands, c => c.Sql.StartsWith("INSERT", StringComparison.Ordinal));
    }

    [Fact]
    public async Task EditarOpensConnectionBeforeTransactionAndUpdatesEveryValor()
    {
        var database = new RecordingConnectionFactory();
        var repository = new IndicesRepository(database);

        var updated = await repository.EditarAsync(new IndicesEditarRequestDto
        {
            Anno = 2024,
            Mes = 12,
            Valores =
            [
                new IndiceValorDto { Id = 21, Val = 4m },
                new IndiceValorDto { Id = 22, Val = 1.5m }
            ]
        });

        Assert.True(updated);
        Assert.Equal(["Open", "BeginTransaction", "Execute", "Execute", "Commit"], database.Events);

        Assert.Equal(2, database.Commands.Count);
        Assert.All(database.Commands, c =>
        {
            Assert.StartsWith("UPDATE AUCO_INDICESCRA", c.Sql);
            Assert.True(c.HadTransaction);
        });
        IndicesAssert.AssertParameters(database.Commands[0],
            ("valor", 4m), ("mitadValor", 2m), ("paraId", 21L), ("anno", 2024), ("mes", 12));
        IndicesAssert.AssertParameters(database.Commands[1],
            ("valor", 1.5m), ("mitadValor", 0.75m), ("paraId", 22L), ("anno", 2024), ("mes", 12));
    }
}

file static class IndicesAssert
{
    internal static void AssertParameters(RecordedCommand command, params (string Name, object Value)[] expected)
    {
        Assert.Equal(expected.Length, command.Parameters.Count);
        foreach (var (name, value) in expected)
        {
            Assert.True(command.Parameters.ContainsKey(name), $"missing parameter '{name}' in: {command.Sql}");
            Assert.Equal(value, command.Parameters[name]);
        }
    }
}

file sealed record RecordedCommand(string Sql, IReadOnlyDictionary<string, object?> Parameters, bool HadTransaction);

/// <summary>
/// Oracle-like fake: connections start closed, BeginTransaction on a closed connection throws
/// (like ODP.NET), and every command is recorded without touching a database.
/// ExecuteScalar returns the queued scalar values in order (null when exhausted).
/// </summary>
file sealed class RecordingConnectionFactory(params object?[] scalars) : IOracleConnectionFactory
{
    internal List<string> Events { get; } = [];
    internal List<RecordedCommand> Commands { get; } = [];
    internal Queue<object?> Scalars { get; } = new(scalars);

    public IDbConnection CreateConnection() => new RecordingDbConnection(this);
}

file sealed class RecordingDbConnection(RecordingConnectionFactory owner) : DbConnection
{
    private ConnectionState state = ConnectionState.Closed;

    internal RecordingConnectionFactory Owner => owner;

    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string ConnectionString { get; set; } = string.Empty;
    public override string Database => "recording";
    public override string DataSource => "recording";
    public override string ServerVersion => "1";
    public override ConnectionState State => state;

    public override void ChangeDatabase(string databaseName) { }

    public override void Open()
    {
        owner.Events.Add("Open");
        state = ConnectionState.Open;
    }

    public override Task OpenAsync(CancellationToken cancellationToken)
    {
        Open();
        return Task.CompletedTask;
    }

    public override void Close() => state = ConnectionState.Closed;

    protected override DbTransaction BeginDbTransaction(IsolationLevel isolationLevel)
    {
        owner.Events.Add("BeginTransaction");
        if (state != ConnectionState.Open)
            throw new InvalidOperationException("Connection must be open for this operation");
        return new RecordingTransaction(this);
    }

    protected override DbCommand CreateDbCommand() => new RecordingCommand(this);
}

file sealed class RecordingTransaction(RecordingDbConnection connection) : DbTransaction
{
    public override IsolationLevel IsolationLevel => IsolationLevel.ReadCommitted;
    protected override DbConnection DbConnection => connection;

    public override void Commit() => connection.Owner.Events.Add("Commit");

    public override void Rollback() => connection.Owner.Events.Add("Rollback");
}

file sealed class RecordingCommand(RecordingDbConnection connection) : DbCommand
{
    private readonly RecordingParameterCollection parameters = new();

    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string CommandText { get; set; } = string.Empty;
    public override int CommandTimeout { get; set; }
    public override CommandType CommandType { get; set; } = CommandType.Text;
    public override bool DesignTimeVisible { get; set; }
    public override UpdateRowSource UpdatedRowSource { get; set; }
    protected override DbConnection? DbConnection { get => connection; set { } }
    protected override DbParameterCollection DbParameterCollection => parameters;
    protected override DbTransaction? DbTransaction { get; set; }

    public override void Cancel() { }
    public override void Prepare() { }
    protected override DbParameter CreateDbParameter() => new RecordingParameter();

    public override int ExecuteNonQuery()
    {
        Record();
        return 1;
    }

    public override object? ExecuteScalar()
    {
        Record();
        return connection.Owner.Scalars.Count > 0 ? connection.Owner.Scalars.Dequeue() : null;
    }

    protected override DbDataReader ExecuteDbDataReader(CommandBehavior behavior)
    {
        Record();
        return new DataTable().CreateDataReader();
    }

    private void Record()
    {
        connection.Owner.Events.Add("Execute");
        connection.Owner.Commands.Add(new RecordedCommand(
            CommandText.Trim(),
            parameters.Items.ToDictionary(p => p.ParameterName, p => p.Value is DBNull ? null : p.Value),
            DbTransaction is not null));
    }
}

file sealed class RecordingParameter : DbParameter
{
    public override DbType DbType { get; set; }
    public override ParameterDirection Direction { get; set; } = ParameterDirection.Input;
    public override bool IsNullable { get; set; }
    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string ParameterName { get; set; } = string.Empty;
    public override int Size { get; set; }
    [System.Diagnostics.CodeAnalysis.AllowNull]
    public override string SourceColumn { get; set; } = string.Empty;
    public override bool SourceColumnNullMapping { get; set; }
    public override object? Value { get; set; }
    public override void ResetDbType() { }
}

file sealed class RecordingParameterCollection : DbParameterCollection
{
    internal List<DbParameter> Items { get; } = [];

    public override int Count => Items.Count;
    public override object SyncRoot => Items;
    public override int Add(object value) { Items.Add((DbParameter)value); return Items.Count - 1; }
    public override void AddRange(Array values) { foreach (var value in values) Add(value!); }
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
