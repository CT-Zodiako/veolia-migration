using Veolia.Api.Contracts.Responses;

namespace Veolia.Api.Infrastructure.Data.Interfaces;

public interface ICostosRepository
{
    Task<ValidapreactualizaResponse> ValidapreactualizaAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken);
    Task<RunPrechecksResponse> RunPrechecksAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken);
    Task<CalculartarifasResponse> CalculartarifasAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken);
    Task<CertificarTarifasResponse> CertificarTarifasAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken);

    Task<IReadOnlyList<CostoItemResponse>> ConsultarCostosAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
    Task<IReadOnlyList<CostoClusItemResponse>> ConsultarCostosClusAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
    Task<IReadOnlyList<ComportaClusItemResponse>> ConsultarComportaClusAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
}
