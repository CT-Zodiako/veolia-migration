    namespace Veolia.Api.Modules.Regulator.InfoGenerales;

    public sealed class ConsultaHistorialRequestDto
    {
        public int Anno { get; set; }
        public int Mes { get; set; }
    }

    public sealed class ConsultaProyeccionRequestDto
    {
        public long Apsaid { get; set; }
        public long Proyid { get; set; }
    }

    public sealed class InfoGeneralesResponseDto<T>
    {
        public string Status { get; set; } = string.Empty;
        public T? Data { get; set; }
        public string Message { get; set; } = string.Empty;
        public string? TraceId { get; set; }
    }
