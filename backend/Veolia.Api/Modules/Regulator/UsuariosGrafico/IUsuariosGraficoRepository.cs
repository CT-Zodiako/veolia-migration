namespace Veolia.Api.Modules.Regulator.UsuariosGrafico;

public interface IUsuariosGraficoRepository
{
    Task<IReadOnlyList<UsuarioPromedioResponse>> GetUsuagrafAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
    Task<IReadOnlyList<UsuarioDetalleResponse>> GetUsuadetaAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
}
