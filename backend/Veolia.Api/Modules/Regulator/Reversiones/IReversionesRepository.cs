namespace Veolia.Api.Modules.Regulator.Reversiones;

public interface IReversionesRepository
{
    Task<int> CrearAutorizacion(int aps, int anno, int mes, string descripcion, int sisuId, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> DetalladoAutorizacion(int sisuId, CancellationToken cancellationToken);
}
