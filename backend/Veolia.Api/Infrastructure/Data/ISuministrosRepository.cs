using Veolia.Api.Contracts.Suministros;
using Veolia.Api.Contracts.Requests;

namespace Veolia.Api.Infrastructure.Data;

public interface ISuministrosRepository
{
    Task<ReversionResponse> SetReversionAsync(SetReversionRequest request, int sisuId, CancellationToken cancellationToken);
    Task<IReadOnlyList<ReversionHistoryItem>> GetReversionAsync(CancellationToken cancellationToken);
    Task<int> FileCargueComercialAsync(FileUploadRequest request, CancellationToken cancellationToken);
    Task<int> FileCargueComercialSemestralAsync(FileUploadRequest request, CancellationToken cancellationToken);
    Task<int> SetCargueInfPropiaAsync(CarguePropiaRequest request, CancellationToken cancellationToken);
    Task<int> SetCargueInfPropiaSemAsync(CarguePropiaSemRequest request, CancellationToken cancellationToken);
    Task<int> SetCargueInfCompetidorAsync(CargueCompetidorRequest request, CancellationToken cancellationToken);
    Task<int> SetCargueInfCompetidorSemestralAsync(CargueCompetidorSemRequest request, CancellationToken cancellationToken);
    Task<int> SetTercerosAsync(TercerosRequest request, CancellationToken cancellationToken);
    Task ReemplazarProductividadAsync(int anno, int mes, IReadOnlyList<ProductividadCargueRow> propios, IReadOnlyList<ProductividadCargueRow> terceros, CancellationToken cancellationToken);
    Task<int> GuardarQrtRuralAsync(QRTRuralRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<dynamic>> GetCanCertificateAsync(PrevalidarRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<dynamic>> GetCanCertificateSemestralAsync(PrevalidarRequest request, CancellationToken cancellationToken);
    Task<string?> CertificarAsync(CertificarRequest request, CancellationToken cancellationToken);
    Task<string?> CertificarSemestralAsync(CertificarRequest request, CancellationToken cancellationToken);
    Task<string?> CertificarMensualAsync(CertificarRequest request, CancellationToken cancellationToken);
    Task<string?> PlCertificarSemestralAsync(CertificarRequest request, CancellationToken cancellationToken);
    Task<string?> CenrtificarEditarAsync(CertificarRequest request, CancellationToken cancellationToken);
    Task<int> InsertCargueComercialBatchAsync(IReadOnlyList<Veolia.Api.Services.ComercialRow> rows, int anno, int mes, CancellationToken cancellationToken);
    Task<int> InsertCargueUsuSemBatchAsync(IReadOnlyList<Veolia.Api.Services.ComercialSemRow> rows, CancellationToken cancellationToken);
    Task<IReadOnlyList<dynamic>> GetPodaAsync(PodaConsultaRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<dynamic>> ConsultaCostoPodaAsync(PodaCatalogoRequest request, CancellationToken cancellationToken);
    Task NewCostoPodaAsync(PodaNuevoRequest request, long usuarioId, CancellationToken cancellationToken);
    Task RegistrarPodaAsync(PodaEditarRequest request, long usuarioId, CancellationToken cancellationToken);
}
