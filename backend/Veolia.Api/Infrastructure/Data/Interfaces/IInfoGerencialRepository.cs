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
    Task<IReadOnlyList<object>> GetDescuentosAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetCatalogoDescuentoAsync(int id, int aps, int anno, int mes, bool isNew, CancellationToken cancellationToken);
    Task InsertDescuentoAsync(int aps, int anno, int mes, int paraId, decimal valor, long usuario, CancellationToken cancellationToken);
    Task UpdateDescuentoAsync(int aps, int anno, int mes, int paraId, decimal valor, CancellationToken cancellationToken);
}
