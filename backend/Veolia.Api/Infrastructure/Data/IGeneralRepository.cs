namespace Veolia.Api.Infrastructure.Data;

public interface IGeneralRepository
{
    /// <summary>
    /// Catálogo transversal de clases de uso (AUCO_CLASESUSO), sin filtro.
    /// Legacy: GET /api/v1/general/consultauso -> SELECT * FROM auco_clasesuso.
    /// </summary>
    Task<IReadOnlyList<object>> ConsultarUsoAsync(CancellationToken cancellationToken);

    /// <summary>
    /// Catálogo de parámetros de costo (AUGE_PARAMETROS, CLAS_CLAS = 20010).
    /// Legacy: GET /api/v1/general/paracostos.
    /// </summary>
    Task<IReadOnlyList<object>> ConsultarCostosAsync(CancellationToken cancellationToken);
}
