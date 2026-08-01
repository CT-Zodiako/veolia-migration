namespace Veolia.Api.Modules.Regulator.Tafna;

public interface ITafnaRepository
{
    Task<IReadOnlyList<TafnaResponse>> GetTafnaAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
}
