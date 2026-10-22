using System.Globalization;
using System.Text;
using Veolia.Api.Infrastructure.GoogleDrive;

namespace Veolia.Api.Modules.Sui853.Configuracion;

public sealed record CargueResiduosRequest(long ApsId, int Anno);
public sealed record CargueFacturacionRequest(long ApsId, int Anno, string? Mes = null);

/// <summary>One (APS, ANNO, MES) combination present in the harvested rows; the load replaces exactly these.</summary>
public sealed record DriveLoadPeriod(long Aps, int Anno, int Mes);
public sealed record DriveLoadOutcome(int Deleted, int Inserted);
public sealed record Sui853ApsInfo(long ApsId, string Nombre, IReadOnlyList<string> Empresas);

public sealed record DriveLoadFieldContext(string FileName, string SheetTitle, int RowNumber, string Campo, string Columna,
    IReadOnlyDictionary<string, object?> Row);

/// <summary>A harvested sheet row converted to bind values aligned with <see cref="DriveLoadTarget.Columns"/>.
/// <see cref="RowNumber"/> is the sheet row (header = 1).</summary>
public sealed record DriveLoadRow(string FileName, string SheetTitle, int RowNumber, IReadOnlyDictionary<string, object?> Source,
    DriveLoadPeriod Period, object?[] Values);

public enum DriveLoadFieldKind { Text, Date, Number }

/// <summary>
/// Destination table and legacy sheet-header map. Table and column names are constants (never user input),
/// so they are safe to place in SQL; every value is bound.
/// </summary>
public sealed class DriveLoadTarget
{
    private static readonly string[] Period = ["APS", "NOMAPS", "ANNO", "MES"];

    // Legacy configuracion/controller.js postCargueResiduos (INSERT INTO SUI.TGEN_RESGENERADOS).
    public static readonly DriveLoadTarget Residuos = new("TGEN_RESGENERADOS", Period,
    [
        ("NUAP", "NUAP", DriveLoadFieldKind.Text),
        ("TIP_SITIO", "TIPO DE SITIO", DriveLoadFieldKind.Text),
        ("NRO_SITIO", "NUSD", DriveLoadFieldKind.Text),
        ("PLACA", "PLACA", DriveLoadFieldKind.Text),
        ("FEC_ENTRADA", "FECHA ENTRADA", DriveLoadFieldKind.Date),
        ("HOR_ENTRADA", "HORA DE ENTRADA", DriveLoadFieldKind.Text),
        ("HOR_SALIDA", "HORA DE SALIDA", DriveLoadFieldKind.Text),
        ("NUM_MICRO", "NUMICRO", DriveLoadFieldKind.Text),
        ("TON_RBU", "TONELADAS RECOGIDAS BARRIDO URBANO", DriveLoadFieldKind.Number),
        ("TON_RBR", "TONELADAS RECOGIDAS BARRIDO RURAL", DriveLoadFieldKind.Number),
        ("TON_RSOU", "TONELADAS RECOGIDAS SERVICIO ORDINARIO URBANO", DriveLoadFieldKind.Number),
        ("TON_RSOR", "TONELADAS RECOGIDAS SERVICIO ORDINARIO RURAL", DriveLoadFieldKind.Number),
        ("SIS_MEDICION", "SISTEMA DE MEDICION", DriveLoadFieldKind.Number)
    ],
    [("VLR_PEAJES", "0"), ("FEC_REGIST", "SYSDATE"), ("USU_REG", "SYS_CONTEXT('USERENV','SESSION_USER')")]);

    // Legacy configuracion/controller.js postCargueInformes (INSERT INTO SUI.TGEN_COMERCIAL, 59 columns).
    public static readonly DriveLoadTarget Comercial = new("TGEN_COMERCIAL", ["APS", "NOMAPS", "EMPRESA", "ANNO", "MES"],
    [
        ("NUID", "NUIS_ASEO", DriveLoadFieldKind.Text), ("CUENTA", "NUIS_SERVICIO", DriveLoadFieldKind.Text),
        ("DEPTO", "DANE_DD", DriveLoadFieldKind.Text), ("MUNI", "DANE_MM", DriveLoadFieldKind.Text),
        ("POBLADO", "DANE_CCC", DriveLoadFieldKind.Text), ("INF_PREDIAL", "INFPREDIAL", DriveLoadFieldKind.Text),
        ("NUMPRED", "NPREDIAL", DriveLoadFieldKind.Text), ("DIRECCION", "DIRECCION", DriveLoadFieldKind.Text),
        ("FECHAEXA", "F_EMISION", DriveLoadFieldKind.Date), ("METODOL", "METOAPLI", DriveLoadFieldKind.Text),
        ("NUAP", "NUAP", DriveLoadFieldKind.Text), ("FECHAINI", "FINIPER", DriveLoadFieldKind.Date),
        ("NUMFAC", "NO_FACTURA", DriveLoadFieldKind.Text), ("MULTIUSU", "CODMULTI", DriveLoadFieldKind.Text),
        ("CAUSALREFA", "CAUSALREFAT", DriveLoadFieldKind.Text), ("FACTREF", "FACTREFACT", DriveLoadFieldKind.Text),
        ("UBICACION", "UBICA", DriveLoadFieldKind.Text), ("CODIGOCLAS", "CLASE_USO", DriveLoadFieldKind.Text),
        ("TIPOAFORO", "TIPOAFO", DriveLoadFieldKind.Text), ("RECOL", "RECOL_SPP", DriveLoadFieldKind.Text),
        ("CODPRODUC", "CODPROD", DriveLoadFieldKind.Text), ("FACPRODUC", "FPS", DriveLoadFieldKind.Text),
        ("INQUILINA", "INQUILINATO", DriveLoadFieldKind.Text), ("PRIORIT", "VIS_VIP", DriveLoadFieldKind.Text),
        ("HCOMUN", "HOGAR", DriveLoadFieldKind.Text),
        ("DIASFAC", "DIASFACT", DriveLoadFieldKind.Number), ("PRODUCCION", "TRNA", DriveLoadFieldKind.Number),
        ("TRLU", "TRLU", DriveLoadFieldKind.Number), ("TRBL", "TRBL", DriveLoadFieldKind.Number),
        ("TRA", "TRA", DriveLoadFieldKind.Number), ("TRRA", "TRRA", DriveLoadFieldKind.Number),
        ("FACTCONJUN", "F_CONJUNTA", DriveLoadFieldKind.Number), ("TFC", "V_TC", DriveLoadFieldKind.Number),
        ("TLU", "V_TLU", DriveLoadFieldKind.Number), ("TBL", "V_TBL", DriveLoadFieldKind.Number),
        ("TRT", "V_TRT", DriveLoadFieldKind.Number), ("TTE", "V_TTE", DriveLoadFieldKind.Number),
        ("TDT", "V_TDF", DriveLoadFieldKind.Number), ("TTL", "V_TTL", DriveLoadFieldKind.Number),
        ("TA", "V_TA", DriveLoadFieldKind.Number), ("FACTORSUBC", "FCS", DriveLoadFieldKind.Number),
        ("VLRSUB", "V_SUBCONTRI", DriveLoadFieldKind.Number), ("VLTARIF", "V_TFS", DriveLoadFieldKind.Number),
        ("VLRMORA", "MORA", DriveLoadFieldKind.Number), ("VLRMINOR", "INT_MORA", DriveLoadFieldKind.Number),
        ("DTOXCAL", "D_CTR", DriveLoadFieldKind.Number), ("DTOXRECL", "D_RC", DriveLoadFieldKind.Number),
        ("DTOXCOMP", "D_CSDF", DriveLoadFieldKind.Number),
        // Legacy quirk kept on purpose (pending business confirmation): DEVFEXCOE also reads D_CSDF.
        ("DEVFEXCOE", "D_CSDF", DriveLoadFieldKind.Number),
        ("DEVEPENXCOE", "DV_ECNA", DriveLoadFieldKind.Number), ("DEVEPENXOTR", "DV_PCNA", DriveLoadFieldKind.Number),
        ("DEVFEXOTR", "DV_OTROS", DriveLoadFieldKind.Number), ("VLRTOTAL", "V_TOTAL", DriveLoadFieldKind.Number),
        ("PAGOSUSUC", "V_PAGO", DriveLoadFieldKind.Number)
    ], []);

    private DriveLoadTarget(string table, string[] prefix, (string Column, string Header, DriveLoadFieldKind Kind)[] fields,
        (string Column, string Expression)[] constants)
    {
        Table = table;
        Prefix = prefix;
        Fields = fields;
        Columns = prefix.Concat(fields.Select(f => f.Column)).ToArray();
        Constants = constants;
    }

    public string Table { get; }
    public IReadOnlyList<string> Columns { get; }
    /// <summary>Server-side values appended to every INSERT (never user input).</summary>
    public IReadOnlyList<(string Column, string Expression)> Constants { get; }
    internal IReadOnlyList<string> Prefix { get; }
    internal IReadOnlyList<(string Column, string Header, DriveLoadFieldKind Kind)> Fields { get; }
}

public sealed class DriveLoadValidationException(DriveLoadFieldContext context, object? valor, string message) : Exception(message)
{
    public string FileName { get; } = context.FileName;
    public string SheetTitle { get; } = context.SheetTitle;
    public int RowNumber { get; } = context.RowNumber;
    public string Campo { get; } = context.Campo;
    public string Columna { get; } = context.Columna;
    public object? Valor { get; } = valor;
    public IReadOnlyDictionary<string, object?> Row { get; } = context.Row;
}

/// <summary>Raised by the repository when inserting the row at <see cref="RowIndex"/> fails; the transaction is rolled back.</summary>
public sealed class DriveLoadRowException(int rowIndex, Exception inner) : Exception(inner.Message, inner)
{
    public int RowIndex { get; } = rowIndex;
}

/// <summary>Converts harvested rows with the legacy rules (safeNumber, DD-MM-YYYY dates, ANNO/MES sources).</summary>
public static class Sui853DriveLoadMapper
{
    public static readonly string[] MonthNames =
        ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    private static readonly Dictionary<string, int> MonthsByName = new(StringComparer.Ordinal)
    {
        ["enero"] = 1, ["febrero"] = 2, ["marzo"] = 3, ["abril"] = 4, ["mayo"] = 5, ["junio"] = 6, ["julio"] = 7,
        ["agosto"] = 8, ["septiembre"] = 9, ["setiembre"] = 9, ["octubre"] = 10, ["noviembre"] = 11, ["diciembre"] = 12
    };

    /// <summary>ANNO is the requested year and MES the month of FECHA ENTRADA (0 without date), as in legacy.</summary>
    public static IReadOnlyList<DriveLoadRow> MapResiduos(long apsId, string apsName, int anno, IReadOnlyList<DriveHarvestFile> files)
    {
        var target = DriveLoadTarget.Residuos;
        var dateIndex = target.Columns.ToList().IndexOf("FEC_ENTRADA");
        return Map(target, files, (file, mapped) =>
        {
            var mes = mapped[dateIndex] is DateTime date ? date.Month : 0;
            return (new object?[] { apsId, apsName, anno, mes }, new DriveLoadPeriod(apsId, anno, mes));
        });
    }

    /// <summary>ANNO/MES come from the file name ("Salamina-SUI Diciembre 2024"), falling back to the requested year and 0.</summary>
    public static IReadOnlyList<DriveLoadRow> MapComercial(long apsId, string apsName, string empresa, int anno, IReadOnlyList<DriveHarvestFile> files)
        => Map(DriveLoadTarget.Comercial, files, (file, _) =>
        {
            var (fileAnno, fileMes) = ParseFileName(file.FileName);
            var period = new DriveLoadPeriod(apsId, fileAnno ?? anno, fileMes ?? 0);
            return (new object?[] { apsId, apsName, empresa, period.Anno, period.Mes }, period);
        });

    public static (int? Anno, int? Mes) ParseFileName(string? fileName)
    {
        var parts = (fileName ?? "").Trim().Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return (null, null);
        int? anno = int.TryParse(parts[^1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var year) ? year : null;
        var rawMes = parts.Length > 1 ? RemoveDiacritics(parts[^2].ToLowerInvariant()) : "";
        return (anno, MonthsByName.TryGetValue(rawMes, out var month) ? month : null);
    }

    public static string? NormalizeMonth(string? month)
    {
        if (string.IsNullOrWhiteSpace(month)) return null;
        return MonthNames.FirstOrDefault(m => string.Equals(m, month.Trim(), StringComparison.OrdinalIgnoreCase))
            ?? throw new ArgumentException("Mes inválido; use el nombre del mes (Enero … Diciembre).");
    }

    /// <summary>Legacy safeNumber: null/blank → 0, anything Number() rejects → validation error.</summary>
    public static decimal SafeNumber(object? value, DriveLoadFieldContext context)
    {
        try
        {
            switch (value)
            {
                case null: return 0m;
                case bool flag: return flag ? 1m : 0m;
                case string text when string.IsNullOrWhiteSpace(text): return 0m;
                case string text when decimal.TryParse(text.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed): return parsed;
                case string: break;
                case IConvertible number when IsNumeric(number): return Convert.ToDecimal(number, CultureInfo.InvariantCulture);
            }
        }
        catch (OverflowException) { }
        throw new DriveLoadValidationException(context, value,
            $"Valor no numérico en '{context.Campo}' ({Format(value)}) en archivo {context.FileName}, hoja {context.SheetTitle}, fila {context.RowNumber}.");
    }

    /// <summary>
    /// Dates arrive as FORMATTED_STRING (legacy TO_DATE(value, 'DD-MM-YYYY')); parsed here and bound as DateTime.
    /// Sheets serial numbers (days since 1899-12-30) are also accepted.
    /// </summary>
    public static DateTime? ParseDate(object? value, DriveLoadFieldContext context)
    {
        switch (value)
        {
            case null: return null;
            case string text when string.IsNullOrWhiteSpace(text): return null;
            case string text when DateTime.TryParseExact(text.Trim(), ["d-M-yyyy", "d/M/yyyy"], CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var date): return date;
            case IConvertible number when value is not string && value is not bool && IsNumeric(number):
                var serial = Convert.ToDouble(number, CultureInfo.InvariantCulture);
                if (serial is > -657435d and < 2958466d) return DateTime.FromOADate(serial);
                break;
        }
        throw new DriveLoadValidationException(context, value,
            $"Fecha inválida en '{context.Campo}' ({Format(value)}) en archivo {context.FileName}, hoja {context.SheetTitle}, fila {context.RowNumber}; use DD-MM-YYYY.");
    }

    private static IReadOnlyList<DriveLoadRow> Map(DriveLoadTarget target, IReadOnlyList<DriveHarvestFile> files,
        Func<DriveHarvestFile, object?[], (object?[] Prefix, DriveLoadPeriod Period)> prefix)
    {
        var result = new List<DriveLoadRow>();
        foreach (var file in files)
        {
            if (file.Tab is null) continue;
            var sheet = file.Tab.SheetTitle;
            for (var i = 0; i < file.Tab.Rows.Count; i++)
            {
                var source = file.Tab.Rows[i];
                var rowNumber = i + 2;
                var values = new object?[target.Columns.Count];
                for (var f = 0; f < target.Fields.Count; f++)
                {
                    var (column, header, kind) = target.Fields[f];
                    source.TryGetValue(header, out var raw);
                    var context = new DriveLoadFieldContext(file.FileName, sheet, rowNumber, header, column, source);
                    values[target.Prefix.Count + f] = kind switch
                    {
                        DriveLoadFieldKind.Number => SafeNumber(raw, context),
                        DriveLoadFieldKind.Date => ParseDate(raw, context),
                        _ => Text(raw)
                    };
                }
                var (head, period) = prefix(file, values);
                head.CopyTo(values, 0);
                result.Add(new DriveLoadRow(file.FileName, sheet, rowNumber, source, period, values));
            }
        }
        return result;
    }

    private static string? Text(object? value) => value switch
    {
        null => null,
        string text => text.Length == 0 ? null : text,
        bool flag => flag ? "true" : "false",
        double d when Math.Abs(d) < 9e15 && d == Math.Floor(d) => ((long)d).ToString(CultureInfo.InvariantCulture),
        double d => d.ToString("R", CultureInfo.InvariantCulture),
        _ => Convert.ToString(value, CultureInfo.InvariantCulture)
    };

    private static bool IsNumeric(IConvertible value) => value.GetTypeCode() is TypeCode.Byte or TypeCode.SByte or TypeCode.Int16
        or TypeCode.UInt16 or TypeCode.Int32 or TypeCode.UInt32 or TypeCode.Int64 or TypeCode.UInt64 or TypeCode.Single
        or TypeCode.Double or TypeCode.Decimal;

    private static string Format(object? value) => Convert.ToString(value, CultureInfo.InvariantCulture) ?? "";

    private static string RemoveDiacritics(string value)
    {
        var builder = new StringBuilder(value.Length);
        foreach (var c in value.Normalize(NormalizationForm.FormD))
            if (CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark) builder.Append(c);
        return builder.ToString().Normalize(NormalizationForm.FormC);
    }
}
