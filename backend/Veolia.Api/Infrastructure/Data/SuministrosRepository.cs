using Dapper;
using System.Data;
using System.Data.Common;
using Veolia.Api.Contracts.Requests;
using Veolia.Api.Contracts.Suministros;
using Veolia.Api.Services;

namespace Veolia.Api.Infrastructure.Data;

public sealed class SuministrosRepository(IOracleConnectionFactory connectionFactory) : ISuministrosRepository
{
    private const int BatchSize = 1000;
    public async Task<ReversionResponse> SetReversionAsync(SetReversionRequest request, int sisuId, CancellationToken cancellationToken)
    {
        const string sql = "BEGIN :res := PK_REVERSION.fauco_reversion(:1,:2,:3,:4,:5); END;";

        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: System.Data.DbType.Int32, direction: System.Data.ParameterDirection.Output);
        parameters.Add("1", request.aps);
        parameters.Add("2", request.mes);
        parameters.Add("3", request.anno);
        parameters.Add("4", request.motivo);
        parameters.Add("5", sisuId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));

        var result = parameters.Get<int?>("res") ?? 0;
        if (result == 1)
        {
            var reversionId = await connection.ExecuteScalarAsync<int?>(
                new CommandDefinition("SELECT MAX(REVE_ID) FROM AUCO_REVERSIONES WHERE USUA_USUA = :sisuId", new { sisuId }, cancellationToken: cancellationToken));

            return new ReversionResponse(true, null, reversionId);
        }

        return new ReversionResponse(false, "No se pudo ejecutar la reversión para el período solicitado.", null);
    }

    public async Task<IReadOnlyList<ReversionHistoryItem>> GetReversionAsync(CancellationToken cancellationToken)
    {
        const string sql = @"
SELECT
    ar.REVE_ID AS ""Id"",
    ar.APSA_ID AS ""Aps"",
    ar.REVE_ANNO AS ""Anno"",
    ar.REVE_MES AS ""Mes"",
    ar.REVE_MOTIVO AS ""Motivo"",
    ar.APSA_FECHACREACION AS ""Fecha"",
    su.SISU_CORREO AS ""Usuario"",
    aa.APSA_NOMAPS AS ""NombreAps""
FROM AUCO_REVERSIONES ar
JOIN AUGE_SISUSUARIO su ON su.SISU_ID = ar.USUA_USUA
JOIN AUCO_APSASEO aa ON aa.APSA_ID = ar.APSA_ID
WHERE su.SISU_ID NOT IN (9,4)
ORDER BY ar.REVE_ANNO DESC, ar.REVE_MES DESC, aa.APSA_NOMAPS";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ReversionHistoryItem>(new CommandDefinition(sql, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<int> FileCargueComercialAsync(FileUploadRequest request, CancellationToken cancellationToken) =>
        await ExecutePackageIntAsync("PK_CERTIFICACION.filecarguecomercial", request.aps, request.anno, request.mes, cancellationToken);

    public async Task<int> FileCargueComercialSemestralAsync(FileUploadRequest request, CancellationToken cancellationToken) =>
        await ExecutePackageIntAsync("PK_CERTIFICACION.filecarguecomercialsemestral", request.aps, request.anno, request.mes, cancellationToken);

    public async Task<int> SetCargueInfPropiaAsync(CarguePropiaRequest request, CancellationToken cancellationToken)
    {
        const string sql = @"INSERT INTO AUCO_CARGUEPROPIO (APSA_ID, CAPR_ANNO, CAPR_MES, CAPR_DATA)
VALUES (:aps, :anno, :mes, :payload)";
        var payload = System.Text.Json.JsonSerializer.Serialize(request.data ?? []);

        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteAsync(new CommandDefinition(sql, new { request.aps, request.anno, request.mes, payload }, cancellationToken: cancellationToken));
    }

    public async Task<int> SetCargueInfPropiaSemAsync(CarguePropiaSemRequest request, CancellationToken cancellationToken)
    {
        const string sql = @"INSERT INTO AUCO_CARGUEPROPIOSEM (APSA_ID, CAPS_ANNO, CAPS_MES, CAPS_DATA)
VALUES (:aps, :anno, :mes, :payload)";
        var payload = System.Text.Json.JsonSerializer.Serialize(request.data ?? []);

        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteAsync(new CommandDefinition(sql, new { request.aps, request.anno, request.mes, payload }, cancellationToken: cancellationToken));
    }

    public async Task<int> SetCargueInfCompetidorAsync(CargueCompetidorRequest request, CancellationToken cancellationToken)
    {
        const string sql = @"INSERT INTO AUCO_CARGUECOMPE (APSA_ID, CACO_ANNO, CACO_MES, CACO_DATA)
VALUES (:aps, :anno, :mes, :payload)";
        var payload = System.Text.Json.JsonSerializer.Serialize(request.data ?? []);

        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteAsync(new CommandDefinition(sql, new { request.aps, request.anno, request.mes, payload }, cancellationToken: cancellationToken));
    }

    public async Task<int> SetCargueInfCompetidorSemestralAsync(CargueCompetidorSemRequest request, CancellationToken cancellationToken)
    {
        const string sql = @"INSERT INTO AUCO_CARGUECOMPESEM (APSA_ID, CACS_ANNO, CACS_MES, CACS_DATA)
VALUES (:aps, :anno, :mes, :payload)";
        var payload = System.Text.Json.JsonSerializer.Serialize(request.data ?? []);

        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteAsync(new CommandDefinition(sql, new { request.aps, request.anno, request.mes, payload }, cancellationToken: cancellationToken));
    }

    public async Task<int> SetTercerosAsync(TercerosRequest request, CancellationToken cancellationToken)
    {
        const string sql = @"INSERT INTO AUCO_CARGUETERCERO (APSA_ID, CATE_ANNO, CATE_MES, CATE_CDF, CATE_CTL, CATE_INCENTIVO)
VALUES (:aps, :anno, :mes, :cdf, :ctl, :incentivo)";

        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteAsync(new CommandDefinition(sql, request, cancellationToken: cancellationToken));
    }

    public async Task<int> GuardarProductividadAsync(ProductividadRequest request, CancellationToken cancellationToken)
    {
        const string sql = @"INSERT INTO PORD_PROPIA (APSA_ID, PORP_ANNO, PORP_MES, PORP_DATA)
VALUES (:aps, :anno, :mes, :propia);
INSERT INTO PORD_TERCERO (APSA_ID, PORT_ANNO, PORT_MES, PORT_DATA)
VALUES (:aps, :anno, :mes, :terceros);";
        var parameters = new
        {
            request.aps,
            request.anno,
            request.mes,
            propia = System.Text.Json.JsonSerializer.Serialize(request.propia ?? []),
            terceros = System.Text.Json.JsonSerializer.Serialize(request.terceros ?? [])
        };

        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<dynamic>> CargueProductividadAsync(ProductividadRequest request, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT APSA_ID AS ""aps"", PORP_ANNO AS ""anno"", PORP_MES AS ""mes"", PORP_DATA AS ""data""
FROM PORD_PROPIA
WHERE APSA_ID = :aps AND PORP_ANNO = :anno AND PORP_MES = :mes";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql, new { request.aps, request.anno, request.mes });
        return rows.ToList();
    }

    public async Task<int> GuardarQrtRuralAsync(QRTRuralRequest request, CancellationToken cancellationToken)
    {
        const string sql = @"INSERT INTO AUCO_CARGUERURAL (APSA_ID, CARU_ANNO, CARU_MES, CARU_QRT, CARU_OBSERVACION)
VALUES (:aps, :anno, :mes, :qrtRural, :observacion)";

        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteAsync(new CommandDefinition(sql, request, cancellationToken: cancellationToken));
    }

    public async Task<IReadOnlyList<dynamic>> GetCanCertificateAsync(PrevalidarRequest request, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT * FROM AUCO_TARIFAS WHERE APSA_ID = :aps AND TARI_ANNO = :anno AND TARI_MES = :mes";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql, request);
        return rows.ToList();
    }

    public async Task<IReadOnlyList<dynamic>> GetCanCertificateSemestralAsync(PrevalidarRequest request, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT * FROM AUCO_TARIFAS WHERE APSA_ID = :aps AND TARI_ANNO = :anno AND TARI_MES = :mes";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql, request);
        return rows.ToList();
    }

    public async Task<string?> CertificarAsync(CertificarRequest request, CancellationToken cancellationToken) =>
        await ExecutePackageStringAsync("PK_CERTIFICACION.fauco_certificar", request.aps, request.anno, request.mes, cancellationToken);

    public async Task<string?> CertificarSemestralAsync(CertificarRequest request, CancellationToken cancellationToken) =>
        await ExecutePackageStringAsync("PK_CERTIFICACION.fauco_certificarsem", request.aps, request.anno, request.mes, cancellationToken);

    public async Task<string?> CertificarMensualAsync(CertificarRequest request, CancellationToken cancellationToken) =>
        await ExecutePackageStringAsync("PK_GIRS.fpgirs_mensual", request.aps, request.anno, request.mes, cancellationToken);

    public async Task<string?> PlCertificarSemestralAsync(CertificarRequest request, CancellationToken cancellationToken) =>
        await ExecutePackageStringAsync("PK_GIRS.fpgirs_semestral", request.aps, request.anno, request.mes, cancellationToken);

    public async Task<string?> CenrtificarEditarAsync(CertificarRequest request, CancellationToken cancellationToken) =>
        await ExecutePackageStringAsync("PK_VALGRAL.fauco_existarifa", request.aps, request.anno, request.mes, cancellationToken);

    public async Task<int> InsertCargueComercialBatchAsync(IReadOnlyList<ComercialRow> rows, int anno, int mes, CancellationToken cancellationToken)
    {
        if (rows.Count == 0) return 0;

        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            var resComercialId = await connection.ExecuteScalarAsync<long>(
                new CommandDefinition(@"SELECT NVL(MAX(RCOM_ID),0)+1 FROM AUCO_RESCOMERCIAL", transaction: transaction, cancellationToken: cancellationToken));

            await connection.ExecuteAsync(new CommandDefinition(@"
INSERT INTO AUCO_RESCOMERCIAL (RCOM_ID, APSA_ID, RCOM_ANNO, RCOM_MES, RCOM_N, RCOM_ND, RCOM_NA, RCOM_TAFNA, RCOM_USUCRE)
VALUES (:rcomId, :aps, :anno, :mes, 0, 0, 0, 0, 0)",
                new { rcomId = resComercialId, aps = rows[0].CodAps, anno, mes }, transaction: transaction, cancellationToken: cancellationToken));

            var nextId = await connection.ExecuteScalarAsync<long>(
                new CommandDefinition(@"SELECT NVL(MAX(CCOM_ID),0)+1 FROM AUCO_CARGUECOMERCIAL", transaction: transaction, cancellationToken: cancellationToken));

            var inserted = 0;
            const string sql = @"
INSERT INTO AUCO_CARGUECOMERCIAL
(CCOM_ID, RCOM_ID, CCOM_CODAPS, CCOM_APSNOM, CCOM_ANNO, CCOM_MES, CCOM_CU, CCOM_NOMCU, CCOM_CODFACTOR, CCOM_CODTIPO, CCOM_TIPO, CCOM_NOMTIPO, CCOM_CANTIDAD, CCOM_TONELADAS, CCOM_USUCRE)
VALUES
(:id, :rcomId, :codAps, :apsNom, :anno, :mes, :codCu, :nomCu, :codFactor, :codTipo, :tipo, :nomTipo, :cantidad, :toneladas, 0)";

            foreach (var chunk in rows.Chunk(BatchSize))
            {
                foreach (var row in chunk)
                {
                    inserted += await connection.ExecuteAsync(new CommandDefinition(sql, new
                    {
                        id = nextId++,
                        rcomId = resComercialId,
                        codAps = row.CodAps,
                        apsNom = row.ApsNom,
                        anno = row.Anno,
                        mes = row.Mes,
                        codCu = row.CodCu,
                        nomCu = row.NomCu,
                        codFactor = row.CodFactor,
                        codTipo = row.CodTipo,
                        tipo = row.Tipo,
                        nomTipo = row.NomTipo,
                        cantidad = row.Cantidad,
                        toneladas = row.Toneladas
                    }, transaction: transaction, cancellationToken: cancellationToken));
                }
            }

            transaction.Commit();
            return inserted;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<int> InsertCargueUsuSemBatchAsync(IReadOnlyList<ComercialSemRow> rows, CancellationToken cancellationToken)
    {
        if (rows.Count == 0) return 0;

        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            var inserted = 0;
            const string sql = @"
INSERT INTO AUCO_CARGUEUSUSEM
(CAUS_CODAPS, CAUS_APSNOM, CAUS_ANNO, CAUS_SEMESTRE, CAUS_CODCU, CAUS_NOMCU, CAUS_CODFACTOR, CAUS_NOMFACTOR, CAUS_CODTIPO, CAUS_NOMTIPO,
CAUS_CANTM1, CAUS_CANTM2, CAUS_CANTM3, CAUS_CANTM4, CAUS_CANTM5, CAUS_CANTM6,
CAUS_TONM1, CAUS_TONM2, CAUS_TONM3, CAUS_TONM4, CAUS_TONM5, CAUS_TONM6, CAUS_USUCRE)
VALUES
(:codAps, :apsNom, :anno, :semestre, :codCu, :nomCu, :codFactor, :nomFactor, :codTipo, :nomTipo,
:cantM1, :cantM2, :cantM3, :cantM4, :cantM5, :cantM6, :tonM1, :tonM2, :tonM3, :tonM4, :tonM5, :tonM6, 0)";

            foreach (var chunk in rows.Chunk(BatchSize))
            {
                foreach (var row in chunk)
                {
                    inserted += await connection.ExecuteAsync(new CommandDefinition(sql, new
                    {
                        codAps = row.CodAps,
                        apsNom = row.ApsNom,
                        anno = row.Anno,
                        semestre = row.Semestre,
                        codCu = row.CodCu,
                        nomCu = row.NomCu,
                        codFactor = row.CodFactor,
                        nomFactor = row.NomFactor,
                        codTipo = row.CodTipo,
                        nomTipo = row.NomTipo,
                        cantM1 = row.CantM1,
                        cantM2 = row.CantM2,
                        cantM3 = row.CantM3,
                        cantM4 = row.CantM4,
                        cantM5 = row.CantM5,
                        cantM6 = row.CantM6,
                        tonM1 = row.TonM1,
                        tonM2 = row.TonM2,
                        tonM3 = row.TonM3,
                        tonM4 = row.TonM4,
                        tonM5 = row.TonM5,
                        tonM6 = row.TonM6
                    }, transaction: transaction, cancellationToken: cancellationToken));
                }
            }

            transaction.Commit();
            return inserted;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    private async Task<int> ExecutePackageIntAsync(string functionName, int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        var sql = $"BEGIN :res := {functionName}(:1,:2,:3); END;";

        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.Int32, direction: ParameterDirection.Output);
        parameters.Add("1", aps);
        parameters.Add("2", anno);
        parameters.Add("3", mes);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return parameters.Get<int?>("res") ?? 0;
    }

    private async Task<string?> ExecutePackageStringAsync(string functionName, int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        var sql = $"BEGIN :res := {functionName}(:1,:2,:3); END;";

        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.String, direction: ParameterDirection.Output, size: 4000);
        parameters.Add("1", aps);
        parameters.Add("2", anno);
        parameters.Add("3", mes);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return parameters.Get<string>("res");
    }

    private async Task<System.Data.IDbConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        var connection = connectionFactory.CreateConnection();

        if (connection is DbConnection dbConnection)
        {
            await dbConnection.OpenAsync(cancellationToken);
        }
        else
        {
            connection.Open();
        }

        return connection;
    }
}
