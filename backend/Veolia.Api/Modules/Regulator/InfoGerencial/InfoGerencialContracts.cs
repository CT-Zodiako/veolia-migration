    using System.Text.Json.Serialization;

    namespace Veolia.Api.Modules.Regulator.InfoGerencial;

    public sealed class ApsPeriodoRequestDto
    {
        public int Aps { get; set; }
        public int Anno { get; set; }
        public int Mes { get; set; }
    }

    public sealed class ApsRequestDto
    {
        public int Aps { get; set; }
    }

    public sealed class DescuentoCatalogoRequestDto
    {
        public int Id { get; set; }
        public int Aps { get; set; }
        public int Anno { get; set; }
        public int Mes { get; set; }
        public bool IsNew { get; set; }
    }

    public sealed class DescuentoGuardarRequestDto
    {
        public int Aps { get; set; }
        public int Anno { get; set; }
        public int Mes { get; set; }
        public int Id { get; set; }
        public decimal Valor { get; set; }
    }

    public sealed class PeriodoRequestDto
    {
        public int Anno { get; set; }
        public int Mes { get; set; }
    }

    // Promedio del semestre anterior que devuelve pk_ocigral720.fauco_getvariablesaps (CLOB JSON).
    // Las claves de "variables" son exactamente las de la función; null cuando la función no la trae.
    public sealed class InfoGerencialVariablesApsDto
    {
        [JsonPropertyName("aps")] public int Aps { get; init; }
        [JsonPropertyName("anno")] public int Anno { get; init; }
        [JsonPropertyName("mes")] public int Mes { get; init; }
        [JsonPropertyName("variables")] public InfoGerencialVariablesDto Variables { get; init; } = new();
    }

    public sealed class InfoGerencialVariablesDto
    {
        [JsonPropertyName("c")] public decimal? C { get; init; }
        [JsonPropertyName("cdf")] public decimal? Cdf { get; init; }
        [JsonPropertyName("crt")] public decimal? Crt { get; init; }
        [JsonPropertyName("lbl")] public decimal? Lbl { get; init; }
        [JsonPropertyName("n")] public decimal? N { get; init; }
        [JsonPropertyName("na")] public decimal? Na { get; init; }
        [JsonPropertyName("naa")] public decimal? Naa { get; init; }
        [JsonPropertyName("nd")] public decimal? Nd { get; init; }
        [JsonPropertyName("qa")] public decimal? Qa { get; init; }
        [JsonPropertyName("qbl")] public decimal? Qbl { get; init; }
        [JsonPropertyName("qlu")] public decimal? Qlu { get; init; }
        [JsonPropertyName("qna")] public decimal? Qna { get; init; }
        [JsonPropertyName("qr")] public decimal? Qr { get; init; }
        [JsonPropertyName("qrs")] public decimal? Qrs { get; init; }
        [JsonPropertyName("qrsmunrecp")] public decimal? Qrsmunrecp { get; init; }
        [JsonPropertyName("qrt")] public decimal? Qrt { get; init; }
        [JsonPropertyName("tafna")] public decimal? Tafna { get; init; }
        [JsonPropertyName("vl")] public decimal? Vl { get; init; }
    }
