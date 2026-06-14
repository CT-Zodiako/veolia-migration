using Veolia.Api.Contracts.Reliquidacion;

namespace Veolia.Api.Infrastructure.Data.Interfaces;

public interface IReliqTarificadorRepository
{
    Task<ResumenResponseDto?> ResumenUsuariosAsync(long reliqId, CancellationToken cancellationToken);
    Task<ResumenResponseDto?> ResumenEmpresaAsync(long reliqId, CancellationToken cancellationToken);
    Task<ResumenResponseDto?> ResumenAdicionalAsync(long reliqId, CancellationToken cancellationToken);
    Task<ResumenResponseDto?> ResumenRellenoAsync(long reliqId, CancellationToken cancellationToken);
    Task<ResumenResponseDto?> ResumenApsAsync(long reliqId, CancellationToken cancellationToken);
    Task<string?> AprobarReliquidacionAsync(long reliqId, long usuarioId, CancellationToken cancellationToken);
    Task<string?> EstadoReliquidacionAsync(long reliqId, CancellationToken cancellationToken);
}
