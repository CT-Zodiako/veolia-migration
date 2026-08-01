namespace Veolia.Api.Modules.Regulator.Health;

public interface IHealthRepository
{
    Task<DatabaseHealthResult> CheckDatabaseAsync(CancellationToken cancellationToken);
}

public record DatabaseHealthResult(bool IsConnected, string Message);
