using System.Globalization;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace Veolia.Api.Modules.Sui853.Configuracion;

public sealed record SheetRequest(string SheetId);
public sealed record CargaGenericaRequest(string SheetId, string SheetTitle, string Owner, string TableName,
    bool PreviewOnly = true, string[]? SelectedColumns = null);
public sealed record TruncateRequest(string Owner, string TableName, bool Confirm = false);
public sealed record CargaColumn(
    [property: JsonPropertyName("COLUMN_NAME")] string COLUMN_NAME,
    [property: JsonPropertyName("DATA_TYPE")] string DATA_TYPE,
    [property: JsonPropertyName("COLUMN_ID")] int COLUMN_ID);

public static class CargaGenericaValidation
{
    public static string Identifier(string? value)
    {
        var normalized = value?.Trim().ToUpperInvariant() ?? "";
        if (!Regex.IsMatch(normalized, @"\A[A-Z][A-Z0-9_]{0,127}\z", RegexOptions.CultureInvariant))
            throw new ArgumentException("Identificador Oracle inválido.");
        return normalized;
    }

    public static string Destination(string? owner, string? table)
    {
        if (Identifier(owner) != "SUI") throw new ArgumentException("El destino debe pertenecer al esquema SUI.");
        return Identifier(table);
    }

    public static void Sheet(string? id, string? title = null)
    {
        if (string.IsNullOrWhiteSpace(id) || !Regex.IsMatch(id, @"\A[A-Za-z0-9_-]+\z"))
            throw new ArgumentException("sheetId inválido.");
        if (title is not null && string.IsNullOrWhiteSpace(title)) throw new ArgumentException("sheetTitle es obligatorio.");
    }

    public static string[] Headers(IReadOnlyList<string> headers)
    {
        if (headers.Count == 0) throw new ArgumentException("La hoja no tiene encabezados.");
        var names = headers.Select(Identifier).ToArray();
        if (names.Distinct(StringComparer.Ordinal).Count() != names.Length)
            throw new ArgumentException("La hoja contiene encabezados duplicados.");
        return names;
    }

    public static string[] Columns(string[] headers, IReadOnlyList<CargaColumn> metadata, string[]? selected)
    {
        var common = headers.Intersect(metadata.Select(c => c.COLUMN_NAME), StringComparer.Ordinal).ToArray();
        var result = selected is { Length: > 0 } ? selected.Select(Identifier).ToArray() : common;
        if (result.Length == 0 || result.Distinct().Count() != result.Length || result.Except(common).Any())
            throw new ArgumentException("No hay columnas válidas o la selección contiene columnas inválidas/duplicadas.");
        return result;
    }

    public static object? Value(object? value, string type)
    {
        var text = Convert.ToString(value, CultureInfo.InvariantCulture)?.Trim();
        if (string.IsNullOrEmpty(text)) return null;
        if (type == "NUMBER")
        {
            if (!decimal.TryParse(text.Replace(',', '.'), NumberStyles.AllowLeadingSign | NumberStyles.AllowDecimalPoint | NumberStyles.AllowExponent,
                    CultureInfo.InvariantCulture, out var number)) throw new ArgumentException("Valor numérico inválido.");
            return number;
        }
        if (type == "DATE" || type.StartsWith("TIMESTAMP", StringComparison.Ordinal))
        {
            if (!DateTime.TryParseExact(text, ["yyyy-MM-dd", "yyyy-MM-dd HH:mm:ss", "yyyy-MM-dd'T'HH:mm:ss"],
                    CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
                throw new ArgumentException("Fecha inválida; use yyyy-MM-dd o yyyy-MM-dd HH:mm:ss.");
            return date;
        }
        if (type is not ("VARCHAR2" or "NVARCHAR2" or "CHAR" or "NCHAR" or "CLOB" or "NCLOB"))
            throw new ArgumentException("Tipo Oracle no soportado para carga genérica.");
        return text;
    }
}
