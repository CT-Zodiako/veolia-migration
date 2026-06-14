namespace Veolia.Api.Infrastructure.Data.Interfaces;

public interface IInfoGeneralesRepository
{
    Task<IReadOnlyList<object>> ConsultaEnergiaAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> ConsultaAcueductoAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> ConsultaCostosAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> ConsultaTarifasAsync(long apsaid, long proyid, long usuario, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> ConsultaHistorialCertificacionesAsync(int anno, int mes, long usuario, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> ConsultaHistorialProductividadAsync(int anno, int mes, long usuario, CancellationToken cancellationToken);
}
