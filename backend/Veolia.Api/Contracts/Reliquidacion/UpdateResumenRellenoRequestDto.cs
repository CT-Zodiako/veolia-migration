namespace Veolia.Api.Contracts.Reliquidacion;

public sealed class UpdateResumenRellenoRequestDto
{
    public long IareId { get; set; }
    public long ReliId { get; set; }
    public decimal Qrs { get; set; }
    public decimal C { get; set; }
    public decimal Vl { get; set; }
    public decimal Ctmlx { get; set; }
    public decimal Ctlk { get; set; }
    public decimal Escenario { get; set; }
    public decimal Cdfk { get; set; }
    public decimal VacdfAbc { get; set; }
    public decimal Vacdf { get; set; }
    public decimal VactlAbc { get; set; }
    public decimal Vactl { get; set; }
}
