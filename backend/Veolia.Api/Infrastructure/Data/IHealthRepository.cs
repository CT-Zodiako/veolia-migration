namespace Veolia.Api.Infrastructure.Data;

public interface IHealthRepository
{
    Task<DatabaseHealthResult> CheckDatabaseAsync(CancellationToken cancellationToken);
}

public record DatabaseHealthResult(bool IsConnected, string Message);
