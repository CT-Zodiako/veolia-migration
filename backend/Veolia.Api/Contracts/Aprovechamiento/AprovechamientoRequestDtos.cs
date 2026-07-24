namespace Veolia.Api.Contracts.Aprovechamiento;

public sealed class AprovechamientoConsultaRequestDto
{
    public int Aps { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
}

public sealed class AprovechamientoActualizarRequestDto
{
    public int Aps { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public bool Activar { get; set; }
}

public sealed class AprovechamientoResponseDto
{
    public int ApsId { get; set; }
    public int AproAnno { get; set; }
    public int AproMes { get; set; }
    public int AproActivar { get; set; }
}
