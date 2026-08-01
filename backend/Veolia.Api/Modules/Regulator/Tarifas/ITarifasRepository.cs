    namespace Veolia.Api.Modules.Regulator.Tarifas;

    public interface ITarifasRepository
    {
        Task<IReadOnlyList<object>> ConsultaTarifaAsync(long aps, int anno, int mes, CancellationToken cancellationToken);
        Task<IReadOnlyList<object>> ConsultaGeneralAsync(int anno, int mes, CancellationToken cancellationToken);
        Task<IReadOnlyList<object>> TarifaPorComponenteAsync(long aps, int anno, int mes, CancellationToken cancellationToken);
        Task<IReadOnlyList<object>> TarifaPorComponenteGeneralAsync(int anno, int mes, CancellationToken cancellationToken);
        Task<IReadOnlyList<object>> ResumenAsync(long aps, int anno, int mes, CancellationToken cancellationToken);
    }
