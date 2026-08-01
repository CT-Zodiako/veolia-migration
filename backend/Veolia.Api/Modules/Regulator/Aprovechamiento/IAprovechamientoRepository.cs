namespace Veolia.Api.Modules.Regulator.Aprovechamiento;

public interface IAprovechamientoRepository
{
    Task<AprovechamientoResponseDto?> ConsultarAsync(int aps, int anno, int mes, CancellationToken cancellationToken = default);
    Task ActualizarAsync(int aps, int anno, int mes, bool activar, long usuarioId, CancellationToken cancellationToken = default);
}
