namespace Veolia.Api.Modules.Regulator.Trna;

public interface ITrnaRepository
{
    Task<IReadOnlyList<TrnaResponse>> GetTrnaAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
}
