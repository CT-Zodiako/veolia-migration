namespace Veolia.Api.Modules.Sui853.Cdft;

public interface ICdftRepository
{
    Task<IReadOnlyList<CdftRowDto>> GetByAnnoAsync(int anno, CancellationToken cancellationToken);
}
