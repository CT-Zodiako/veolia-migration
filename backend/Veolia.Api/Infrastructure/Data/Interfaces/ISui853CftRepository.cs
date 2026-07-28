using Veolia.Api.Contracts.Sui853;

namespace Veolia.Api.Infrastructure.Data.Interfaces;

public interface ISui853CftRepository
{
    Task<Formato2ResponseDto?> GetFormatoAsync(string codigo, CancellationToken cancellationToken);
}
