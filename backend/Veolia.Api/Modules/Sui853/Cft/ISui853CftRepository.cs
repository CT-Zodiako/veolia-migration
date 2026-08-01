namespace Veolia.Api.Modules.Sui853.Cft;

public interface ISui853CftRepository
{
    Task<Formato2ResponseDto?> GetFormatoAsync(string codigo, CancellationToken cancellationToken);
}
