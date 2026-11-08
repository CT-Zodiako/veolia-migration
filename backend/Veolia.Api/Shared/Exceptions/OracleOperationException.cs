using System.Text.RegularExpressions;

namespace Veolia.Api.Exceptions;

// An Oracle error enriched with what was being executed, so logs and support can tell which
// package/function failed, with which parameters, and which constraint was violated.
public sealed partial class OracleOperationException(
    string operation,
    IReadOnlyDictionary<string, object?> parameters,
    int oraNumber,
    string oracleMessage,
    Exception? innerException = null)
    : Exception($"{FormatOraCode(oraNumber)} en {operation}: {oracleMessage}", innerException)
{
    public string Operation { get; } = operation;

    public IReadOnlyDictionary<string, object?> Parameters { get; } = parameters;

    public int OraNumber { get; } = oraNumber;

    public string OracleMessage { get; } = oracleMessage;

    public string OraCode => FormatOraCode(OraNumber);

    // ORA-00001 "unique constraint (OWNER.NAME) violated", ORA-02291/02292 "integrity constraint (OWNER.NAME) violated".
    public string? Constraint
    {
        get
        {
            var match = ConstraintPattern().Match(OracleMessage);
            return match.Success ? match.Groups[1].Value : null;
        }
    }

    // "aps=5 mes=12 anno=2025": greppable in plain-text logs.
    public string FormatParameters() => string.Join(' ', Parameters.Select(p => $"{p.Key}={p.Value}"));

    private static string FormatOraCode(int number) => $"ORA-{Math.Abs(number):D5}";

    [GeneratedRegex(@"constraint \(([^)]+)\)", RegexOptions.IgnoreCase)]
    private static partial Regex ConstraintPattern();
}
