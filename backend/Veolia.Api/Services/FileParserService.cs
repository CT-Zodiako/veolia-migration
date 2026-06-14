using System.Globalization;

namespace Veolia.Api.Services;

public sealed class FileParserService
{
    public async Task<ParseResult<ComercialRow>> ParseComercialAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (!IsCsv(file.FileName))
        {
            return new ParseResult<ComercialRow>(0, [], ["Solo se soporta formato CSV en este momento."]);
        }

        var parsed = await ParseCsvAsync(file, 12, cancellationToken);
        var valid = new List<ComercialRow>();
        var errors = new List<string>(parsed.Errors);

        foreach (var row in parsed.Rows)
        {
            if (!TryDecimal(row.Values[10], out var cantidad) || !TryDecimal(row.Values[11], out var toneladas))
            {
                errors.Add($"Fila {row.RowNumber}: cantidad/toneladas deben ser numéricos.");
                continue;
            }

            valid.Add(new ComercialRow(
                CodAps: ToInt(row.Values[0]),
                ApsNom: row.Values[1],
                Anno: ToInt(row.Values[2]),
                Mes: ToInt(row.Values[3]),
                CodCu: ToInt(row.Values[4]),
                NomCu: row.Values[5],
                CodFactor: ToInt(row.Values[6]),
                CodTipo: ToInt(row.Values[7]),
                Tipo: ToInt(row.Values[8]),
                NomTipo: row.Values[9],
                Cantidad: cantidad,
                Toneladas: toneladas));
        }

        return new ParseResult<ComercialRow>(parsed.TotalRows, valid, errors);
    }

    public async Task<ParseResult<ComercialSemRow>> ParseComercialSemAsync(IFormFile file, CancellationToken cancellationToken)
    {
        if (!IsCsv(file.FileName))
        {
            return new ParseResult<ComercialSemRow>(0, [], ["Solo se soporta formato CSV en este momento."]);
        }

        var parsed = await ParseCsvAsync(file, 22, cancellationToken);
        var valid = new List<ComercialSemRow>();
        var errors = new List<string>(parsed.Errors);

        foreach (var row in parsed.Rows)
        {
            var values = row.Values;
            if (!TryManyDecimals(values[10..22], out var nums))
            {
                errors.Add($"Fila {row.RowNumber}: valores de cantidades/toneladas inválidos.");
                continue;
            }

            valid.Add(new ComercialSemRow(
                CodAps: ToInt(values[0]),
                ApsNom: values[1],
                Anno: ToInt(values[2]),
                Semestre: ToInt(values[3]),
                CodCu: ToInt(values[4]),
                NomCu: values[5],
                CodFactor: ToInt(values[6]),
                NomFactor: ToInt(values[7]),
                CodTipo: ToInt(values[8]),
                NomTipo: values[9],
                CantM1: nums[0], CantM2: nums[1], CantM3: nums[2], CantM4: nums[3], CantM5: nums[4], CantM6: nums[5],
                TonM1: nums[6], TonM2: nums[7], TonM3: nums[8], TonM4: nums[9], TonM5: nums[10], TonM6: nums[11]));
        }

        return new ParseResult<ComercialSemRow>(parsed.TotalRows, valid, errors);
    }

    private static bool IsCsv(string fileName) => Path.GetExtension(fileName).Equals(".csv", StringComparison.OrdinalIgnoreCase);

    private static async Task<CsvRawParseResult> ParseCsvAsync(IFormFile file, int expectedColumns, CancellationToken cancellationToken)
    {
        var rows = new List<CsvRawRow>();
        var errors = new List<string>();
        var rowNumber = 0;

        await using var stream = file.OpenReadStream();
        using var reader = new StreamReader(stream);

        string? line;
        while ((line = await reader.ReadLineAsync(cancellationToken)) is not null)
        {
            rowNumber++;
            if (rowNumber == 1) continue; // header
            if (string.IsNullOrWhiteSpace(line)) continue;

            var delimiter = line.Contains(';') ? ';' : ',';
            var parts = line.Split(delimiter).Select(x => x.Trim()).ToArray();
            if (parts.Length != expectedColumns)
            {
                errors.Add($"Fila {rowNumber}: se esperaban {expectedColumns} columnas y llegaron {parts.Length}.");
                continue;
            }

            rows.Add(new CsvRawRow(rowNumber, parts));
        }

        return new CsvRawParseResult(rowNumber > 0 ? rowNumber - 1 : 0, rows, errors);
    }

    private static int ToInt(string value) => int.TryParse(value, out var n) ? n : 0;

    private static bool TryDecimal(string value, out decimal number)
    {
        return decimal.TryParse(value, NumberStyles.Any, CultureInfo.InvariantCulture, out number)
            || decimal.TryParse(value, NumberStyles.Any, CultureInfo.GetCultureInfo("es-CO"), out number);
    }

    private static bool TryManyDecimals(string[] values, out decimal[] numbers)
    {
        numbers = new decimal[values.Length];
        for (var i = 0; i < values.Length; i++)
        {
            if (!TryDecimal(values[i], out var n)) return false;
            numbers[i] = n;
        }
        return true;
    }

    private sealed record CsvRawRow(int RowNumber, string[] Values);
    private sealed record CsvRawParseResult(int TotalRows, IReadOnlyList<CsvRawRow> Rows, IReadOnlyList<string> Errors);
}

public sealed record ParseResult<T>(int TotalRows, IReadOnlyList<T> ValidRows, IReadOnlyList<string> Errors);

public sealed record ComercialRow(
    int CodAps,
    string ApsNom,
    int Anno,
    int Mes,
    int CodCu,
    string NomCu,
    int CodFactor,
    int CodTipo,
    int Tipo,
    string NomTipo,
    decimal Cantidad,
    decimal Toneladas);

public sealed record ComercialSemRow(
    int CodAps,
    string ApsNom,
    int Anno,
    int Semestre,
    int CodCu,
    string NomCu,
    int CodFactor,
    int NomFactor,
    int CodTipo,
    string NomTipo,
    decimal CantM1,
    decimal CantM2,
    decimal CantM3,
    decimal CantM4,
    decimal CantM5,
    decimal CantM6,
    decimal TonM1,
    decimal TonM2,
    decimal TonM3,
    decimal TonM4,
    decimal TonM5,
    decimal TonM6);
