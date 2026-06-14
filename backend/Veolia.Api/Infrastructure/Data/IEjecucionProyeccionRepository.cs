namespace Veolia.Api.Infrastructure.Data;

public interface IEjecucionProyeccionRepository
{
    Task<string> EjecutarProyectarAsync(long proyId, long apsaId, long usuarioId, CancellationToken cancellationToken);
}
