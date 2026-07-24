namespace Veolia.Api.Contracts.Requests;

public sealed record PodaConsultaRequest(int aps, int anno, int mes);

public sealed record PodaCatalogoRequest(int aps);

public sealed record PodaNuevoItem(int EMPR_EMPR, string? EMPR_NOMBRE, decimal valor);

public sealed record PodaNuevoRequest(IReadOnlyList<PodaNuevoItem> datos, int aps, int anno, int mes);

public sealed record PodaEditarRequest(int EMPR_EMPR, decimal CPTE_VALORSUI, int apsa_id, int cpte_anno, int cpte_mes);
