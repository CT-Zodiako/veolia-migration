namespace Veolia.Api.Infrastructure.Data;

public interface ISuiReversionesRepository
{
    Task<IReadOnlyList<object>> GetReversionesF19(int aps, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetReversionesF23(int aps, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetReversionesF24(int aps, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetReversionesF35(int aps, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetReversionesF36(int aps, CancellationToken cancellationToken);
}
