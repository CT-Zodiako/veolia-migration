namespace Veolia.Api.Contracts.Proyecciones;

public sealed class EjecutarProyeccionRequest
{
    public long ProyId { get; set; }
    public long ApsaId { get; set; }
}

public sealed class EjecutarProyeccionResponse
{
    public bool Success { get; set; }
    public int Resultado { get; set; }
}
