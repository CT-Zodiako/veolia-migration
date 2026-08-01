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
