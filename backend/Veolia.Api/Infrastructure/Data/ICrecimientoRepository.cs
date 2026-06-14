using Veolia.Api.Contracts.Proyecciones;

namespace Veolia.Api.Infrastructure.Data;

public interface ICrecimientoRepository
{
    Task<CrecimientoPayload> ConsultarAsync(long proyId, CancellationToken cancellationToken);
    Task<MutationResponse> RegistrarUsuariosAsync(CrecimientoUsuariosRequest request, CancellationToken cancellationToken);
    Task<MutationResponse> RegistrarPropiaAsync(CrecimientoPropiaRequest request, CancellationToken cancellationToken);
    Task<MutationResponse> RegistrarTercerosAsync(CrecimientoTercerosRequest request, CancellationToken cancellationToken);
    Task<MutationResponse> RegistrarDescuentosAsync(DescuentosRequest request, CancellationToken cancellationToken);
}
