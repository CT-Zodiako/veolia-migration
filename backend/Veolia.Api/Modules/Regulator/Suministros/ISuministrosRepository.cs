using Veolia.Api.Contracts.Requests;

namespace Veolia.Api.Modules.Regulator.Suministros;

public interface ISuministrosRepository
{
    Task<ReversionResponse> SetReversionAsync(SetReversionRequest request, int sisuId, CancellationToken cancellationToken);
    Task<IReadOnlyList<ReversionHistoryItem>> GetReversionAsync(CancellationToken cancellationToken);
    Task<int> SetCargueInfPropiaAsync(CarguePropiaRequest request, long usuarioId, CancellationToken cancellationToken);
    Task<int> SetCargueInfPropiaSemAsync(CarguePropiaSemRequest request, long usuarioId, CancellationToken cancellationToken);
    Task<int> SetCargueInfCompetidorAsync(CargueCompetidorRequest request, long usuarioId, CancellationToken cancellationToken);
    Task<int> SetCargueInfCompetidorSemestralAsync(CargueCompetidorSemRequest request, long usuarioId, CancellationToken cancellationToken);
    Task<int> SetTercerosAsync(TercerosRequest request, long usuarioId, CancellationToken cancellationToken);
    Task<int> SetCargueComercialAsync(CargueComercialRequest request, long usuarioId, CancellationToken cancellationToken);
    Task<int> SetCargueComercialSemAsync(CargueComercialSemRequest request, long usuarioId, CancellationToken cancellationToken);
    Task ReemplazarProductividadAsync(int anno, int mes, IReadOnlyList<ProductividadCargueRow> propios, IReadOnlyList<ProductividadCargueRow> terceros, CancellationToken cancellationToken);
    Task<int> GuardarQrtRuralAsync(QRTRuralRequest request, long usuarioId, CancellationToken cancellationToken);
    Task<IReadOnlyList<dynamic>> GetCanCertificateAsync(PrevalidarRequest request, CancellationToken cancellationToken);
    Task<int> GetCanCertificateSemestralAsync(PrevalidarSemestralRequest request, CancellationToken cancellationToken);
    Task<string?> CertificarAsync(CertificarRequest request, CancellationToken cancellationToken);
    Task<int?> CertificarSemestralAsync(CertificarSemestralRequest request, long usuarioId, CancellationToken cancellationToken);
    Task<string?> CertificarMensualAsync(CertificarRequest request, CancellationToken cancellationToken);
    Task<PlCertificarSemestralResponse> PlCertificarSemestralAsync(CertificarSemestralRequest request, CancellationToken cancellationToken);
    Task<string?> CenrtificarEditarAsync(CertificarRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<dynamic>> GetPodaAsync(PodaConsultaRequest request, CancellationToken cancellationToken);
    Task<IReadOnlyList<dynamic>> ConsultaCostoPodaAsync(PodaCatalogoRequest request, CancellationToken cancellationToken);
    Task NewCostoPodaAsync(PodaNuevoRequest request, long usuarioId, CancellationToken cancellationToken);
    Task RegistrarPodaAsync(PodaEditarRequest request, long usuarioId, CancellationToken cancellationToken);
}
