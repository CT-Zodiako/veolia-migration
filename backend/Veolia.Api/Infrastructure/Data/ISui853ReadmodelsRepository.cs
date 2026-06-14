namespace Veolia.Api.Infrastructure.Data;

public interface ISui853ReadmodelsRepository
{
    Task<IReadOnlyList<object>> GetVcfgApsEmpresaAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetVcfgApsDocumentoAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetTcfgApsAsync(CancellationToken cancellationToken);
}
