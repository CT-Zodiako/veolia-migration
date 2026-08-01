    namespace Veolia.Api.Modules.Regulator.Validaciones;

    public interface IValidacionesRepository
    {
        Task<string?> ExecuteAsync(string oracleFunction, int aps, int anno, int mes, CancellationToken ct);
    }
