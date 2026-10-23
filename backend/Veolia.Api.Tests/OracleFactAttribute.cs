namespace Veolia.Api.Tests;

/// <summary>
/// Integration test against a real Oracle instance. Skipped unless VEOLIA_ORACLE_TESTS=1, so a
/// run without Oracle reports it as skipped instead of passing without asserting anything.
/// </summary>
public sealed class OracleFactAttribute : FactAttribute
{
    internal const string EnableVariable = "VEOLIA_ORACLE_TESTS";

    public OracleFactAttribute()
    {
        if (Environment.GetEnvironmentVariable(EnableVariable) != "1")
        {
            Skip = $"Requires a reachable Oracle database; set {EnableVariable}=1 to run.";
        }
    }
}
