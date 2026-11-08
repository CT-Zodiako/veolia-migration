    using System.Data.Common;
    using System.Text.Json;
    using Dapper;
    using Oracle.ManagedDataAccess.Types;
    using Veolia.Api.Infrastructure.Data;

    namespace Veolia.Api.Modules.Regulator.InfoGerencial;

    // Interfaz aparte de IInfoGerencialRepository: la función es nueva (no existe en legacy) y así los
    // dobles de prueba existentes de IInfoGerencialRepository no tienen que implementarla.
    public interface IInfoGerencialVariablesApsRepository
    {
        Task<InfoGerencialVariablesApsDto> GetVariablesApsAsync(int aps, int anno, int mes, CancellationToken cancellationToken);
    }

    public sealed class InfoGerencialVariablesApsRepository(IOracleConnectionFactory connectionFactory) : IInfoGerencialVariablesApsRepository
    {
        private const string Sql = "SELECT pk_ocigral720.fauco_getvariablesaps(:aps, :anno, :mes) FROM dual";

        public async Task<InfoGerencialVariablesApsDto> GetVariablesApsAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
        {
            using var connection = connectionFactory.CreateConnection();
            if (connection.State != System.Data.ConnectionState.Open)
            {
                if (connection is DbConnection dbConnection)
                    await dbConnection.OpenAsync(cancellationToken);
                else
                    connection.Open();
            }

            // Parámetros con nombre: Dapper activa BindByName en OracleCommand.
            var value = await connection.ExecuteScalarAsync<object?>(
                new CommandDefinition(Sql, new { aps, anno, mes }, cancellationToken: cancellationToken));

            return Parse(aps, anno, mes, ReadClob(value));
        }

        // ODP.NET devuelve el CLOB como string; si llega como OracleClob se lee y se libera.
        private static string? ReadClob(object? value)
        {
            switch (value)
            {
                case null or DBNull:
                    return null;
                case string text:
                    return text;
                case OracleClob clob:
                    using (clob)
                        return clob.IsNull ? null : clob.Value;
                default:
                    return value.ToString();
            }
        }

        // S2: {"aps":..,"anno":..,"mes":..,"variables":{"c":0,...}}. CLOB nulo, sin "variables", clave ausente
        // o valor no numérico -> null en esa variable (el front muestra "—").
        public static InfoGerencialVariablesApsDto Parse(int aps, int anno, int mes, string? json)
        {
            if (string.IsNullOrWhiteSpace(json))
                return new InfoGerencialVariablesApsDto { Aps = aps, Anno = anno, Mes = mes };

            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;
            var hasVariables = root.ValueKind == JsonValueKind.Object
                && root.TryGetProperty("variables", out var variables)
                && variables.ValueKind == JsonValueKind.Object;
            var source = hasVariables ? root.GetProperty("variables") : default;

            decimal? Read(string key) =>
                hasVariables && source.TryGetProperty(key, out var element) && element.ValueKind == JsonValueKind.Number
                    ? element.GetDecimal()
                    : null;

            return new InfoGerencialVariablesApsDto
            {
                Aps = aps,
                Anno = anno,
                Mes = mes,
                Variables = new InfoGerencialVariablesDto
                {
                    C = Read("c"),
                    Cdf = Read("cdf"),
                    Crt = Read("crt"),
                    Lbl = Read("lbl"),
                    N = Read("n"),
                    Na = Read("na"),
                    Naa = Read("naa"),
                    Nd = Read("nd"),
                    Qa = Read("qa"),
                    Qbl = Read("qbl"),
                    Qlu = Read("qlu"),
                    Qna = Read("qna"),
                    Qr = Read("qr"),
                    Qrs = Read("qrs"),
                    Qrsmunrecp = Read("qrsmunrecp"),
                    Qrt = Read("qrt"),
                    Tafna = Read("tafna"),
                    Vl = Read("vl")
                }
            };
        }
    }
