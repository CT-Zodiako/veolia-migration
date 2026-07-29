using Veolia.Api.Contracts.Responses;

namespace Veolia.Api.Infrastructure.Data.Interfaces;

public interface IUsuariosGraficoRepository
{
    Task<IReadOnlyList<UsuarioPromedioResponse>> GetUsuagrafAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
    Task<IReadOnlyList<UsuarioDetalleResponse>> GetUsuadetaAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
}
