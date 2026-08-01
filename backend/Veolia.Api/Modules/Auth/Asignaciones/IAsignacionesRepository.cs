namespace Veolia.Api.Modules.Auth.Asignaciones;

public interface IAsignacionesRepository
{
    // F-AUTH-06 APS por usuario
    Task<(IReadOnlyList<object> Asignadas, IReadOnlyList<object> SinAsignar)> GetApsAsignadasAsync(long id, CancellationToken cancellationToken);
    Task<object?> SetApsxUsuarioAsync(long id, IReadOnlyList<long> outAps, IReadOnlyList<long> inAps, CancellationToken cancellationToken);

    // F-AUTH-07 Sistemas por usuario
    Task<(long SisuId, IReadOnlyList<object> Asignados, IReadOnlyList<object> SinAsignar)> GetSistemasPorUsuarioAsync(string correo, CancellationToken cancellationToken);
    Task<string> AsignarSistemaAsync(long sisuId, IReadOnlyList<long> asignados, IReadOnlyList<long> noAsignados, CancellationToken cancellationToken);
}
