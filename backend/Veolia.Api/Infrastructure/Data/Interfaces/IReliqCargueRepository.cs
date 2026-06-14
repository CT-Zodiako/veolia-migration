using Veolia.Api.Contracts.Reliquidacion;

namespace Veolia.Api.Infrastructure.Data.Interfaces;

public interface IReliqCargueRepository
{
    Task<string?> CompararCostosCargueAsync(long reliq, long apsaId, CancellationToken cancellationToken);
    Task<IReadOnlyList<CompararCostosResponseDto>> CompararCostosAsync(long reliq, CancellationToken cancellationToken);
    Task<IReadOnlyList<CompararTarifasResponseDto>> CompararTarifasAsync(long reliq, CancellationToken cancellationToken);
    Task<ResumenCompararTarifasResponseDto?> ResumenCompararTarifasAsync(long reliq, long apsaId, int anno, int mes, CancellationToken cancellationToken);
    Task<IReadOnlyList<ReliInfoUsuariosDto>> GetReliInfoUsuariosAsync(long idReliq, CancellationToken cancellationToken);
    Task<IReadOnlyList<ReliInfoEmpresaDto>> GetResumenEmpresaAsync(long idReliq, CancellationToken cancellationToken);
    Task<IReadOnlyList<ReliInfoApsDto>> GetResumenApsAsync(long idReliq, CancellationToken cancellationToken);
    Task<IReadOnlyList<ReliInfoRellenoDto>> GetResumenRellenoAsync(long idReliq, CancellationToken cancellationToken);
    Task<IReadOnlyList<ReliInfoAdicionalDto>> GetReliInfoAdicionalAsync(long idReliq, CancellationToken cancellationToken);
    Task<int> UpdateReliInfoUsuariosAsync(IReadOnlyList<UpdateReliInfoUsuariosRequestDto> items, long userId, CancellationToken cancellationToken);
    Task<int> UpdateResumenEmpresaAsync(IReadOnlyList<UpdateResumenEmpresaRequestDto> items, long userId, CancellationToken cancellationToken);
    Task<int> UpdateResumenApsAsync(IReadOnlyList<UpdateResumenApsRequestDto> items, long userId, CancellationToken cancellationToken);
    Task<int> UpdateResumenRellenoAsync(IReadOnlyList<UpdateResumenRellenoRequestDto> items, long userId, CancellationToken cancellationToken);
    Task<int> UpdateResumenAdicionalAsync(IReadOnlyList<UpdateResumenAdicionalRequestDto> items, long userId, CancellationToken cancellationToken);
}
