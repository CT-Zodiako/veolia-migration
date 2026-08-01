namespace Veolia.Api.Modules.Regulator.Killometros;

public interface IKillometrosRepository
{
    Task<IReadOnlyList<LblResponse>> GetLblAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
}
