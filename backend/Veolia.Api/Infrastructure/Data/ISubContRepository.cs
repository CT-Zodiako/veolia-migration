using Veolia.Api.Contracts.SubCont;

namespace Veolia.Api.Infrastructure.Data;

public interface ISubContRepository
{
    Task<List<SubContItemResponse>> ConsultarAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
    Task<SubContResponse> CrearAsync(int aps, int anno, int mes, List<SubContValorItem> valores, long usuarioId, CancellationToken cancellationToken);
    Task<SubContResponse> EditarAsync(int aps, int anno, int mes, List<SubContValorItem> valores, CancellationToken cancellationToken);
    Task<List<SubContApsResponse>> ListarApsAsync(CancellationToken cancellationToken);
    Task<SubContResponse> EliminarAsync(long id, CancellationToken cancellationToken);
}
