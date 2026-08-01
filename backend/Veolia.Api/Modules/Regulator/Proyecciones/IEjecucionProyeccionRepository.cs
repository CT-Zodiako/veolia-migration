namespace Veolia.Api.Modules.Regulator.Proyecciones;

public interface IEjecucionProyeccionRepository
{
    Task<int> EjecutarProyectarAsync(long proyId, long apsaId, long usuarioId, CancellationToken cancellationToken);
}
