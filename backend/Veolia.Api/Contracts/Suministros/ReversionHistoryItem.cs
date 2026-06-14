namespace Veolia.Api.Contracts.Suministros;

public class ReversionHistoryItem
{
    public int Id { get; set; }
    public int Aps { get; set; }
    public int Anno { get; set; }
    public int Mes { get; set; }
    public string Motivo { get; set; } = string.Empty;
    public DateTime Fecha { get; set; }
    public string Usuario { get; set; } = string.Empty;
    public string NombreAps { get; set; } = string.Empty;
}
