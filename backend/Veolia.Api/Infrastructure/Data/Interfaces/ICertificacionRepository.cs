using Microsoft.AspNetCore.Http;
using Veolia.Api.Contracts.Requests;
using Veolia.Api.Contracts.Responses;

namespace Veolia.Api.Infrastructure.Data.Interfaces;

public interface ICertificacionRepository
{
    Task<IReadOnlyList<CatalogoItemResponse>> GetPeriodosAsync(int? vigencia, CancellationToken cancellationToken);
    Task<IReadOnlyList<CatalogoItemResponse>> GetMunicipiosAsync(int departamentoId, CancellationToken cancellationToken);
    Task<IReadOnlyList<CatalogoItemResponse>> GetPrestadoresAsync(int municipioId, string? filtro, CancellationToken cancellationToken);
    Task<IReadOnlyList<CatalogoItemResponse>> GetTiposCargueAsync(CancellationToken cancellationToken);
    Task<CrearCargueResponse> CrearCargueAsync(CrearCargueRequest request, CancellationToken cancellationToken);
    Task<SubirArchivoResponse> SubirArchivoAsync(long cargueId, IFormFile file, CancellationToken cancellationToken);
    Task<ParsearArchivoResponse> ParsearArchivoAsync(long cargueId, ParsearArchivoRequest request, CancellationToken cancellationToken);
    Task<ResumenCargueResponse> GetResumenCargueAsync(long cargueId, CancellationToken cancellationToken);
    Task<ErroresCargueResponse> GetErroresCargueAsync(long cargueId, int page, int size, CancellationToken cancellationToken);
    Task<ConfirmarCargueResponse> ConfirmarCargueAsync(long cargueId, ConfirmarCargueRequest request, CancellationToken cancellationToken);
    Task<EjecutarValidacionResponse> EjecutarValidacionAsync(EjecutarValidacionRequest request, CancellationToken cancellationToken);
    Task<EstadoValidacionResponse> GetValidacionAsync(long validacionId, CancellationToken cancellationToken);
    Task<EjecutarCertificacionResponse> EjecutarCertificacionAsync(EjecutarCertificacionRequest request, CancellationToken cancellationToken);
    Task<EstadoEjecucionResponse> GetEjecucionAsync(long ejecucionId, CancellationToken cancellationToken);
    Task<ResultadosCertificacionResponse> GetResultadosAsync(long cargueId, CancellationToken cancellationToken);
    Task<RevertirCargueResponse> RevertirCargueAsync(long cargueId, RevertirCargueRequest request, CancellationToken cancellationToken);
    Task<PlantillaResponse> GetPlantillaAsync(int tipoCargueId, CancellationToken cancellationToken);
}
