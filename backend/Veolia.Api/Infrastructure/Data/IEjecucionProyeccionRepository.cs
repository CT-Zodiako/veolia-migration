namespace Veolia.Api.Infrastructure.Data;

public interface IEjecucionProyeccionRepository
{
    Task<int> EjecutarProyectarAsync(long proyId, long apsaId, long usuarioId, CancellationToken cancellationToken);
}
