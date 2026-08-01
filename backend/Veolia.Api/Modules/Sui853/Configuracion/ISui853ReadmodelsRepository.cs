namespace Veolia.Api.Modules.Sui853.Configuracion;

public interface ISui853ReadmodelsRepository
{
    Task<IReadOnlyList<object>> GetVcfgApsEmpresaAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetVcfgApsDocumentoAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> GetTcfgApsAsync(CancellationToken cancellationToken);
}
