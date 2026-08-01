namespace Veolia.Api.Modules.Regulator.Toneladas;

public interface IToneladasRepository
{
    Task<IReadOnlyList<QrtResponse>> GetQrtAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
    Task<IReadOnlyList<QaResponse>> GetQaAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
    Task<IReadOnlyList<DetalleResponse>> GetDetalleAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
}
