namespace Veolia.Api.Infrastructure.Data.Interfaces;

public interface IInfoGerencialRepository
{
    Task<IReadOnlyList<object>> GetDetalleCostosAsync(int anno, int mes, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetDetalleSubAporteAsync(int anno, int mes, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetInfoApsEmprDiviAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetInfoEmprDiviAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetInfoApsRellenoAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetDashBoardGerencialAsync(int anno, int mes, long usuario, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetCostoPodaAsync(int aps, CancellationToken cancellationToken);
}
