namespace Veolia.Api.Modules.Reliquidaciones.Contracts;

/// <summary>
/// Contadores del bloque "resultados" que devuelve reliq.pkrei_aplicarreliquida.fnrei_aplicartodo
/// (ver legacy tarificador/controller.js:303-312 y Tarificador.vue, dialog de aprobación).
/// </summary>
public sealed class AprobarReliquidacionContadoresDto
{
    public int Iaed { get; set; }
    public int Ined { get; set; }
    public int Iare { get; set; }
    public int Iuae { get; set; }
    public int Cead { get; set; }
}
