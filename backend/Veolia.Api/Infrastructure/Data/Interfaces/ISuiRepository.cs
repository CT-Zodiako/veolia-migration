using Veolia.Api.Contracts.Requests;
using Veolia.Api.Contracts.Responses;

namespace Veolia.Api.Infrastructure.Data.Interfaces;

public interface ISuiRepository
{
    Task<SuiDashboardResponse> DashboardAsync(int anno, int mes, long usuario, CancellationToken cancellationToken);
    Task<IReadOnlyList<dynamic>> ConsultarFormatoAsync(string formato, int aps, int mes, int anno, CancellationToken cancellationToken);
    Task<IReadOnlyList<object>> ResumenFormatosAsync(string formato, int aps, CancellationToken cancellationToken);
    Task<SuiProcesarResponse> ProcesarAsync(SuiProcesarRequest request, CancellationToken cancellationToken);
    Task<SuiComplementoResponse> GuardarComplementoAsync(SuiComplementoRequest request, CancellationToken cancellationToken);
    Task<SuiPrecheckResponse> GetCanCertificateAsync(int aps, int mes, int anno, CancellationToken cancellationToken);
}
