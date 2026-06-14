namespace Veolia.Api.Infrastructure.Data;

public interface ITarifasRepository
{
    Task<IReadOnlyList<object>> ConsultaTarifaAsync(long aps, int anno, int mes, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> ConsultaGeneralAsync(int anno, int mes, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> TarifaPorComponenteAsync(long aps, int anno, int mes, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> TarifaPorComponenteGeneralAsync(int anno, int mes, CancellationToken cancellationToken);
}
