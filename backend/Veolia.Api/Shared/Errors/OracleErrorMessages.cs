using System.Text.RegularExpressions;

namespace Veolia.Api.Infrastructure.Errors;

// The one place that turns an Oracle error into the message the user reads in the toast.
public static partial class OracleErrorMessages
{
    public const string Unmapped = "Oracle devolvió un error al procesar la solicitud.";

    public const string ConnectionLost = "Se perdió la conexión con Oracle.";

    public static string For(int oraNumber, string oracleMessage, string? constraint)
    {
        var number = Math.Abs(oraNumber);
        return number switch
        {
            1 => constraint is null
                ? "Oracle rechazó datos duplicados. La operación no se completó."
                : $"Oracle rechazó datos duplicados (restricción {constraint}). La operación no se completó.",
            1400 => "Faltan datos obligatorios para completar la operación en Oracle.",
            2291 => "No existe información relacionada para la operación solicitada.",
            3135 => ConnectionLost,
            >= 20000 and <= 20999 => ApplicationMessage(oracleMessage) ?? Unmapped,
            _ => Unmapped
        };
    }

    // raise_application_error text: "ORA-20001: <message>\nORA-06512: at ..." -> "<message>".
    private static string? ApplicationMessage(string oracleMessage)
    {
        var lines = oracleMessage
            .Split('\n')
            .Select(line => line.TrimEnd('\r'))
            .TakeWhile(line => !line.TrimStart().StartsWith("ORA-06512", StringComparison.OrdinalIgnoreCase));
        var text = OraPrefix().Replace(string.Join('\n', lines).Trim(), string.Empty).Trim();
        return text.Length == 0 ? null : text;
    }

    [GeneratedRegex(@"^ORA-\d{5}:\s*")]
    private static partial Regex OraPrefix();
}
