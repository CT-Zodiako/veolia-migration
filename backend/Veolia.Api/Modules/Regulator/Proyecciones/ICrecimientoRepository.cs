namespace Veolia.Api.Modules.Regulator.Proyecciones;

public interface ICrecimientoRepository
{
    Task<CrecimientoDriveConfig?> GetDriveConfigAsync(long apsaId, CancellationToken cancellationToken);
    Task<CrecimientoPayload> ConsultarAsync(long proyId, CancellationToken cancellationToken);
    Task<MutationResponse> RegistrarUsuariosAsync(CrecimientoUsuariosRequest request, long usuarioId, CancellationToken cancellationToken);
    Task<MutationResponse> RegistrarPropiaAsync(CrecimientoPropiaRequest request, long usuarioId, CancellationToken cancellationToken);
    Task<MutationResponse> RegistrarTercerosAsync(CrecimientoTercerosRequest request, long usuarioId, CancellationToken cancellationToken);
    Task<MutationResponse> RegistrarDescuentosAsync(DescuentosRequest request, long usuarioId, CancellationToken cancellationToken);
}
