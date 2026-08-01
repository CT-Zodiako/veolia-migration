using Dapper;
using System.Data;
using System.Data.Common;
using Veolia.Api.Contracts.Requests;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Data;

namespace Veolia.Api.Modules.Regulator.Suministros;

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

    public async Task<int> SetCargueInfPropiaAsync(CarguePropiaRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        if (request.resumemes is null || request.resumemes.Count == 0) return 0;

        const string deleteSql = "DELETE FROM AUCO_CARGUEPROPIO WHERE APSA_ID = :aps AND PROP_ANNO = :anno AND PROP_MES = :mes";
        const string insertSql = @"INSERT INTO AUCO_CARGUEPROPIO
(APSA_ID, EMPR_EMPR, PROP_ANNO, PROP_MES, PROP_CP, PROP_MT3AGUA, PROP_M2CC, PROP_M2LAV, PROP_TI, PROP_TM, PROP_KLP, PROP_T, PROP_QA, PROP_ESCENARIO, PROP_FECCREA, USUA_USUARIO)
VALUES (:aps, :empr, :anno, :mes, :cp, :mt3agua, :m2cc, :m2lav, :ti, :tm, :klp, :t, :qa, :escenario, SYSDATE, :usuario)";

        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();
        try
        {
            var inserted = 0;
            foreach (var fila in request.resumemes)
            {
                await connection.ExecuteAsync(new CommandDefinition(deleteSql, new { aps = fila.aps, anno = fila.anno, mes = fila.mes }, transaction: transaction, cancellationToken: cancellationToken));
                inserted += await connection.ExecuteAsync(new CommandDefinition(insertSql, new
                {
                    aps = fila.aps,
                    empr = fila.empr,
                    anno = fila.anno,
                    mes = fila.mes,
                    cp = fila.cp,
                    mt3agua = fila.mt3agua,
                    m2cc = fila.m2cc,
                    m2lav = fila.m2lav,
                    ti = fila.ti,
                    tm = fila.tm,
                    klp = fila.klp,
                    t = fila.t,
                    qa = fila.qa,
                    escenario = fila.escenario,
                    usuario = usuarioId
                }, transaction: transaction, cancellationToken: cancellationToken));
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

    public async Task<int> SetCargueInfPropiaSemAsync(CarguePropiaSemRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        if (request.resumesem is null || request.resumesem.Count == 0) return 0;

        const string deleteSql = "DELETE FROM AUCO_CARGUEPROPIOSEM WHERE APSA_ID = :aps AND PROP_ANNO = :anno AND PROP_MES = :mes";
        const string insertSql = @"INSERT INTO TARIFICADOR.AUCO_CARGUEPROPIOSEM
(APSA_ID, EMPR_EMPR, PROP_ANNO, PROP_MES, PROP_QRT, PROP_QLU, PROP_QNA, PROP_QBL, PROP_QR, PROP_QRS, PROP_LBL, PROP_VL, PROP_ESCENARIO, PROP_CTLMX, PROP_CPE, PROP_NAA, PROP_TAFA, PROP_CRTPROPIO, PROP_CDFPROPIO, PROP_FECCREA, USUA_USUARIO, PROP_QRSMUNRECP)
VALUES (:aps, :empr, :anno, :mes, :qrt, :qlu, :qna, :qbl, :qr, :qrs, :lbl, :vl, :esce, :ctlmx, :cpe, :naa, :tafa, :crtpro, :cdfpro, SYSDATE, :usuario, :qrsmunrecp)";

        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();
        try
        {
            var inserted = 0;
            foreach (var fila in request.resumesem)
            {
                await connection.ExecuteAsync(new CommandDefinition(deleteSql, new { aps = fila.aps, anno = fila.anno, mes = fila.mes }, transaction: transaction, cancellationToken: cancellationToken));
                inserted += await connection.ExecuteAsync(new CommandDefinition(insertSql, new
                {
                    aps = fila.aps,
                    empr = fila.empr,
                    anno = fila.anno,
                    mes = fila.mes,
                    qrt = fila.qrt,
                    qlu = fila.qlu,
                    qna = fila.qna,
                    qbl = fila.qbl,
                    qr = fila.qr,
                    qrs = fila.qrs,
                    lbl = fila.lbl,
                    vl = fila.vl,
                    esce = fila.esce,
                    ctlmx = fila.ctlmx,
                    cpe = fila.cpe,
                    naa = fila.naa,
                    tafa = fila.tafa,
                    crtpro = fila.crtpro,
                    cdfpro = fila.cdfpro,
                    usuario = usuarioId,
                    qrsmunrecp = fila.qrsmunrecp
                }, transaction: transaction, cancellationToken: cancellationToken));
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

    public async Task<int> SetCargueInfCompetidorAsync(CargueCompetidorRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        if (request.resumemes is null || request.resumemes.Count == 0) return 0;

        const string deleteSql = "DELETE FROM AUCO_CARGUECOMPE WHERE APSA_ID = :aps AND EMPR_EMPR = :empr AND COMP_ANNO = :anno AND COMP_MES = :mes";
        const string insertSql = @"INSERT INTO AUCO_CARGUECOMPE
(APSA_ID, EMPR_EMPR, COMP_ANNO, COMP_MES, COMP_CP, COMP_MT3AGUA, COMP_M2CC, COMP_M2LAV, COMP_TI, COMP_TM, COMP_KLP, COMP_CBLJ, COMP_FECCREA, USUA_USUARIO)
VALUES (:aps, :empr, :anno, :mes, :cp, :mt3agua, :m2cc, :m2lav, :ti, :tm, :klp, :cblj, SYSDATE, :usuario)";

        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();
        try
        {
            var inserted = 0;
            foreach (var fila in request.resumemes)
            {
                await connection.ExecuteAsync(new CommandDefinition(deleteSql, new { aps = fila.aps, empr = fila.empr, anno = fila.anno, mes = fila.mes }, transaction: transaction, cancellationToken: cancellationToken));
                inserted += await connection.ExecuteAsync(new CommandDefinition(insertSql, new
                {
                    aps = fila.aps,
                    empr = fila.empr,
                    anno = fila.anno,
                    mes = fila.mes,
                    cp = fila.cp,
                    mt3agua = fila.mt3agua,
                    m2cc = fila.m2cc,
                    m2lav = fila.m2lav,
                    ti = fila.ti,
                    tm = fila.tm,
                    klp = fila.klp,
                    cblj = fila.cblj,
                    usuario = usuarioId
                }, transaction: transaction, cancellationToken: cancellationToken));
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

    public async Task<int> SetCargueInfCompetidorSemestralAsync(CargueCompetidorSemRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        if (request.resumesem is null || request.resumesem.Count == 0) return 0;

        const string deleteSql = "DELETE FROM AUCO_CARGUECOMPESEM WHERE APSA_ID = :aps AND EMPR_EMPR = :empr AND COMP_ANNO = :anno AND COMP_MES = :mes";
        const string insertSql = @"INSERT INTO TARIFICADOR.AUCO_CARGUECOMPESEM
(APSA_ID, EMPR_EMPR, COMP_ANNO, COMP_MES, COMP_N, COMP_NAA, COMP_NDA, COMP_QLU, COMP_QNA, COMP_QBL, COMP_QR, COMP_CBLJ, COMP_LBLCOM, COMP_CRTVBA, COMP_CDFVBA, COMP_QRT, COMP_FECCREA, USUA_USUARIO)
VALUES (:aps, :empr, :anno, :mes, :n, :na, :nd, :qlu, :qna, :qbl, :qr, :cblj, :lbl, :crtcomp, :cdfcomp, :qrtz, SYSDATE, :usuario)";

        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();
        try
        {
            var inserted = 0;
            foreach (var fila in request.resumesem)
            {
                await connection.ExecuteAsync(new CommandDefinition(deleteSql, new { aps = fila.aps, empr = fila.empr, anno = fila.anno, mes = fila.mes }, transaction: transaction, cancellationToken: cancellationToken));
                inserted += await connection.ExecuteAsync(new CommandDefinition(insertSql, new
                {
                    aps = fila.aps,
                    empr = fila.empr,
                    anno = fila.anno,
                    mes = fila.mes,
                    n = fila.n,
                    na = fila.na,
                    nd = fila.nd,
                    qlu = fila.qlu,
                    qna = fila.qna,
                    qbl = fila.qbl,
                    qr = fila.qr,
                    cblj = fila.cblj,
                    lbl = fila.lbl,
                    crtcomp = fila.crtcomp,
                    cdfcomp = fila.cdfcomp,
                    qrtz = fila.qrtz,
                    usuario = usuarioId
                }, transaction: transaction, cancellationToken: cancellationToken));
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

    public async Task<int> SetCargueComercialSemAsync(CargueComercialSemRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        if (request.filecontent is null || request.filecontent.Count == 0) return 0;

        var primera = request.filecontent[0];

        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();
        try
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "DELETE FROM AUCO_CARGUEUSUSEM WHERE CAUS_CODAPS = :codaps AND CAUS_ANNO = :anno AND CAUS_SEMESTRE = :semestre",
                new { codaps = primera.codaps, anno = primera.anno, semestre = primera.semestre }, transaction: transaction, cancellationToken: cancellationToken));

            var inserted = 0;
            const string insertSql = @"INSERT INTO TARIFICADOR.AUCO_CARGUEUSUSEM
(CAUS_CODAPS, CAUS_APSNOM, CAUS_ANNO, CAUS_SEMESTRE, CAUS_CODCU, CAUS_NOMCU, CAUS_CODFACTOR, CAUS_NOMFACTOR, CAUS_CODTIPO, CAUS_NOMTIPO, CAUS_CANTM1, CAUS_CANTM2, CAUS_CANTM3, CAUS_CANTM4, CAUS_CANTM5, CAUS_CANTM6, CAUS_TONM1, CAUS_TONM2, CAUS_TONM3, CAUS_TONM4, CAUS_TONM5, CAUS_TONM6, CAUS_FECRE, CAUS_USUCRE)
VALUES (:codaps, :apsNom, :anno, :semestre, :coduso, :nomuso, :codfactor, :nomfact, :codtipo, :nomtipo, :susm1, :susm2, :susm3, :susm4, :susm5, :susm6, :afom1, :afom2, :afom3, :afom4, :afom5, :afom6, SYSDATE, :usuario)";

            foreach (var fila in request.filecontent)
            {
                inserted += await connection.ExecuteAsync(new CommandDefinition(insertSql, new
                {
                    codaps = fila.codaps,
                    apsNom = fila.aps,
                    anno = fila.anno,
                    semestre = fila.semestre,
                    coduso = fila.coduso,
                    nomuso = fila.nomuso,
                    codfactor = fila.codfactor,
                    nomfact = fila.nomfact,
                    codtipo = fila.codtipo,
                    nomtipo = fila.nomtipo,
                    susm1 = fila.susm1,
                    susm2 = fila.susm2,
                    susm3 = fila.susm3,
                    susm4 = fila.susm4,
                    susm5 = fila.susm5,
                    susm6 = fila.susm6,
                    afom1 = fila.afom1,
                    afom2 = fila.afom2,
                    afom3 = fila.afom3,
                    afom4 = fila.afom4,
                    afom5 = fila.afom5,
                    afom6 = fila.afom6,
                    usuario = usuarioId
                }, transaction: transaction, cancellationToken: cancellationToken));
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

    public async Task<int> SetTercerosAsync(TercerosRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        const string deleteSql = "DELETE FROM AUCO_CARGUETERCERO WHERE APSA_ID = :aps AND TERC_ANNO = :anno AND TERC_MES = :mes";
        const string insertSql = @"INSERT INTO AUCO_CARGUETERCERO (APSA_ID, TERC_ANNO, TERC_MES, TERC_CDF, TERC_CTL, TERC_INCENTIVOCDF, TERC_FECCREA, USUA_USUARIO)
VALUES (:aps, :anno, :mes, :cdf, :ctl, :incentivo, SYSDATE, :usuario)";

        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();
        try
        {
            await connection.ExecuteAsync(new CommandDefinition(deleteSql, new { request.aps, request.anno, request.mes }, transaction: transaction, cancellationToken: cancellationToken));
            var result = await connection.ExecuteAsync(new CommandDefinition(insertSql, new { request.aps, request.anno, request.mes, request.cdf, request.ctl, request.incentivo, usuario = usuarioId }, transaction: transaction, cancellationToken: cancellationToken));
            transaction.Commit();
            return result;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<int> SetCargueComercialAsync(CargueComercialRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        if (request.filecontent is null || request.filecontent.Count == 0) return 0;

        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();
        try
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "DELETE FROM AUCO_CARGUECOMERCIAL WHERE CCOM_CODAPS = :aps AND CCOM_ANNO = :anno AND CCOM_MES = :mes",
                new { request.aps, request.anno, request.mes }, transaction: transaction, cancellationToken: cancellationToken));
            await connection.ExecuteAsync(new CommandDefinition(
                "DELETE FROM AUCO_RESCOMERCIAL WHERE APSA_ID = :aps AND RCOM_ANNO = :anno AND RCOM_MES = :mes",
                new { request.aps, request.anno, request.mes }, transaction: transaction, cancellationToken: cancellationToken));

            var rcomId = await connection.ExecuteScalarAsync<long>(
                new CommandDefinition("SELECT SAUCO_RESCOMERCIAL.NEXTVAL FROM DUAL", transaction: transaction, cancellationToken: cancellationToken));

            await connection.ExecuteAsync(new CommandDefinition(@"
INSERT INTO AUCO_RESCOMERCIAL (RCOM_ID, APSA_ID, RCOM_ANNO, RCOM_MES, RCOM_N, RCOM_ND, RCOM_NA, RCOM_TAFNA, RCOM_FECRE, RCOM_USUCRE)
VALUES (:rcomId, :aps, :anno, :mes, :n, :nd, :na, :tafna, SYSDATE, :usuario)",
                new
                {
                    rcomId,
                    request.aps,
                    request.anno,
                    request.mes,
                    n = request.resume.n,
                    nd = request.resume.nd,
                    na = request.resume.na,
                    tafna = request.resume.tafna,
                    usuario = usuarioId
                }, transaction: transaction, cancellationToken: cancellationToken));

            var inserted = 0;
            const string insertDetalle = @"
INSERT INTO AUCO_CARGUECOMERCIAL
(CCOM_ID, RCOM_ID, CCOM_CODAPS, CCOM_APSNOM, CCOM_ANNO, CCOM_MES, CCOM_CU, CCOM_NOMCU, CCOM_CODFACTOR, CCOM_CODTIPO, CCOM_TIPO, CCOM_NOMTIPO, CCOM_CANTIDAD, CCOM_TONELADAS, CCOM_FECRE, CCOM_USUCRE)
VALUES (SAUCO_CARGUECOMERCIAL.NEXTVAL, :rcomId, :codaps, :apsNom, :anno, :mes, :coduso, :nomuso, :codfactor, :codtipo, :tipo, :tiponom, :cantidad, :toneladas, SYSDATE, :usuario)";

            foreach (var fila in request.filecontent)
            {
                inserted += await connection.ExecuteAsync(new CommandDefinition(insertDetalle, new
                {
                    rcomId,
                    codaps = fila.codaps,
                    apsNom = fila.aps,
                    anno = fila.anno,
                    mes = fila.mes,
                    coduso = fila.coduso,
                    nomuso = fila.nomuso,
                    codfactor = fila.codfactor,
                    codtipo = fila.codtipo,
                    tipo = fila.tipo,
                    tiponom = fila.tiponom,
                    cantidad = fila.cantidad,
                    toneladas = fila.toneladas,
                    usuario = usuarioId
                }, transaction: transaction, cancellationToken: cancellationToken));
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

    public async Task ReemplazarProductividadAsync(int anno, int mes, IReadOnlyList<ProductividadCargueRow> propios, IReadOnlyList<ProductividadCargueRow> terceros, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "DELETE FROM PORD_PROPIA WHERE PRODANNO = :anno AND PRODMES = :mes",
                new { anno, mes }, transaction: transaction, cancellationToken: cancellationToken));

            await connection.ExecuteAsync(new CommandDefinition(
                "DELETE FROM PORD_TERCERO WHERE TERCANNO = :anno AND TERCMES = :mes",
                new { anno, mes }, transaction: transaction, cancellationToken: cancellationToken));

            const string insertPropiaSql = @"
INSERT INTO PORD_PROPIA (CODAPS, NOMAPS, CODEMPRESA, NOMEMPRESA, PRODANNO, PRODMES, PRODCCS, PRODCBLS, PRODCLUS, PRODCRT, PRODCDF, PRODCTL)
VALUES (:codAps, :aps, :codEmpresa, :empresa, :anno, :mes, :ccs, :cbls, :clus, :crt, :cdf, :ctl)";

            foreach (var row in propios)
            {
                await connection.ExecuteAsync(new CommandDefinition(insertPropiaSql, new
                {
                    codAps = row.COD_APS,
                    aps = row.APS,
                    codEmpresa = row.COD_EMPRESA,
                    empresa = row.EMPRESA,
                    anno = row.ANNO,
                    mes = row.MES,
                    ccs = row.CCS,
                    cbls = row.CBLS,
                    clus = row.CLUS,
                    crt = row.CRT,
                    cdf = row.CDF,
                    ctl = row.CTL
                }, transaction: transaction, cancellationToken: cancellationToken));
            }

            const string insertTerceroSql = @"
INSERT INTO PORD_TERCERO (CODAPS, NOMAPS, CODEMPRESA, NOMEMPRESA, TERCANNO, TERCMES, TERCCCS, TERCCBLS, TERCCLUS, TERCCRT, TERCCDF, TERCCTL)
VALUES (:codAps, :aps, :codEmpresa, :empresa, :anno, :mes, :ccs, :cbls, :clus, :crt, :cdf, :ctl)";

            foreach (var row in terceros)
            {
                await connection.ExecuteAsync(new CommandDefinition(insertTerceroSql, new
                {
                    codAps = row.COD_APS,
                    aps = row.APS,
                    codEmpresa = row.COD_EMPRESA,
                    empresa = row.EMPRESA,
                    anno = row.ANNO,
                    mes = row.MES,
                    ccs = row.CCS,
                    cbls = row.CBLS,
                    clus = row.CLUS,
                    crt = row.CRT,
                    cdf = row.CDF,
                    ctl = row.CTL
                }, transaction: transaction, cancellationToken: cancellationToken));
            }

            transaction.Commit();
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<int> GuardarQrtRuralAsync(QRTRuralRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        const string deleteSql = "DELETE FROM AUCO_CARGUERURAL WHERE APSA_ID = :aps AND RURA_ANNO = :anno AND RURA_SEMESTRE = :semestre";
        const string insertSql = @"INSERT INTO AUCO_CARGUERURAL (APSA_ID, RURA_ANNO, RURA_SEMESTRE, RURA_QRT, COMP_FECCREA, USUA_USUARIO)
VALUES (:aps, :anno, :semestre, :qrtRural, SYSDATE, :usuario)";

        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();
        try
        {
            await connection.ExecuteAsync(new CommandDefinition(deleteSql, new { request.aps, request.anno, request.semestre }, transaction: transaction, cancellationToken: cancellationToken));
            var result = await connection.ExecuteAsync(new CommandDefinition(insertSql, new { request.aps, request.anno, request.semestre, request.qrtRural, usuario = usuarioId }, transaction: transaction, cancellationToken: cancellationToken));
            transaction.Commit();
            return result;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    public async Task<IReadOnlyList<dynamic>> GetCanCertificateAsync(PrevalidarRequest request, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT * FROM AUCO_TARIFAS WHERE APSA_ID = :aps AND TARI_ANNO = :anno AND TARI_MES = :mes";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql, request);
        return rows.ToList();
    }

    public async Task<int> GetCanCertificateSemestralAsync(PrevalidarSemestralRequest request, CancellationToken cancellationToken)
    {
        var mesCierre = request.semestre == 1 ? 6 : 12;
        const string sql = @"SELECT COUNT(1) AS CANTIDAD FROM AUCO_TARIFAS WHERE APSA_ID = :aps AND TARI_ANNO = :anno AND TARI_MES = :mesCierre";

        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.ExecuteScalarAsync<int>(new CommandDefinition(sql, new { request.aps, request.anno, mesCierre }, cancellationToken: cancellationToken));
    }

    public async Task<string?> CertificarAsync(CertificarRequest request, CancellationToken cancellationToken) =>
        await ExecutePackageStringAsync("PK_CERTIFICACION.fauco_certificar", request.aps, request.anno, request.mes, cancellationToken);

    public async Task<int?> CertificarSemestralAsync(CertificarSemestralRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        const string sql = "BEGIN :res := PK_CERTIFICACION.fauco_certificarsem(:1,:2,:3,:4); COMMIT; END;";

        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.Int32, direction: ParameterDirection.Output);
        parameters.Add("1", request.aps);
        parameters.Add("2", request.semestre);
        parameters.Add("3", request.anno);
        parameters.Add("4", usuarioId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return parameters.Get<int?>("res");
    }

    public async Task<string?> CertificarMensualAsync(CertificarRequest request, CancellationToken cancellationToken) =>
        await ExecutePackageStringAsync("PK_GIRS.fpgirs_mensual", request.aps, request.anno, request.mes, cancellationToken);

    public async Task<PlCertificarSemestralResponse> PlCertificarSemestralAsync(CertificarSemestralRequest request, CancellationToken cancellationToken)
    {
        const string sql = "BEGIN :res := PK_GIRS.fpgirs_semestral(:1,:2,:3); END;";

        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.String, direction: ParameterDirection.Output, size: 4000);
        parameters.Add("1", request.aps);
        parameters.Add("2", request.anno);
        parameters.Add("3", request.semestre);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        var raw = parameters.Get<string>("res");

        if (string.IsNullOrWhiteSpace(raw))
        {
            return new PlCertificarSemestralResponse([]);
        }

        using var doc = System.Text.Json.JsonDocument.Parse(raw);
        var datasets = new List<SemestralDataset>();
        foreach (var item in doc.RootElement.GetProperty("dataset").EnumerateArray())
        {
            var pgris = item.GetProperty("pgris").EnumerateArray().Select(ToDecimal).ToList();
            var barrido = item.GetProperty("barrido").EnumerateArray()
                .Select(b => new BarridoItem(
                    b[0].ToString(),
                    b[1].ToString(),
                    b[2].ToString()))
                .ToList();
            datasets.Add(new SemestralDataset(pgris, barrido));
        }

        return new PlCertificarSemestralResponse(datasets);
    }

    public async Task<string?> CenrtificarEditarAsync(CertificarRequest request, CancellationToken cancellationToken) =>
        await ExecutePackageStringAsync("PK_VALGRAL.fauco_existarifa", request.aps, request.anno, request.mes, cancellationToken);

    public async Task<IReadOnlyList<dynamic>> GetPodaAsync(PodaConsultaRequest request, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT EMPS.EMPR_NOMBRE, PODA.CPTE_VALORSUI, PODA.CPTE_VALORFACT, PODA.CPTE_TIPINGRESO, EMPS.EMPR_EMPR
              FROM AUCO_PODATECHO PODA
              INNER JOIN AUCO_APSEMPRDIVI EPRD ON PODA.EMPR_EMPR = EPRD.EMPR_EMPR AND PODA.APSA_ID = EPRD.APSA_ID
              INNER JOIN AUGE_EMPRESAS EMPS ON EMPS.EMPR_EMPR = EPRD.EMPR_EMPR
             WHERE PODA.APSA_ID = :aps
               AND PODA.CPTE_ANNO = :anno
               AND PODA.CPTE_MES = :mes
               AND EMPS.EMPR_ESTADO = 1";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql, request);
        return rows.ToList();
    }

    public async Task<IReadOnlyList<dynamic>> ConsultaCostoPodaAsync(PodaCatalogoRequest request, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT E.*
              FROM AUGE_EMPRESAS E
              JOIN AUCO_APSEMPRDIVI AE ON E.EMPR_EMPR = AE.EMPR_EMPR
             WHERE AE.APSA_ID = :aps
               AND E.EMPR_ESTADO = 1";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync(sql, request);
        return rows.ToList();
    }

    public async Task NewCostoPodaAsync(PodaNuevoRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        const string sql = @"
            INSERT INTO AUCO_PODATECHO
            (APSA_ID, EMPR_EMPR, CPTE_ANNO, CPTE_MES, CPTE_VALORSUI, CPTE_VALORFACT, CPTE_VARIACION, CPTE_TIPINGRESO, CPTE_FECCREA, USUA_USUA)
            VALUES (:aps, :emprEmpr, :anno, :mes, :valor, 0, 0, 1, SYSDATE, :usuario)";

        using var connection = await OpenConnectionAsync(cancellationToken);
        foreach (var item in request.datos)
        {
            await connection.ExecuteAsync(new CommandDefinition(
                sql,
                new { aps = request.aps, emprEmpr = item.EMPR_EMPR, anno = request.anno, mes = request.mes, valor = item.valor, usuario = usuarioId },
                cancellationToken: cancellationToken));
        }
    }

    public async Task RegistrarPodaAsync(PodaEditarRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        const string sql = @"
            UPDATE AUCO_PODATECHO
               SET CPTE_VALORSUI = :valor,
                   CPTE_TIPINGRESO = 1,
                   USUA_USUA = :usuario
             WHERE APSA_ID = :aps
               AND EMPR_EMPR = :emprEmpr
               AND CPTE_ANNO = :anno
               AND CPTE_MES = :mes";

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(
            sql,
            new { valor = request.CPTE_VALORSUI, aps = request.apsa_id, emprEmpr = request.EMPR_EMPR, anno = request.cpte_anno, mes = request.cpte_mes, usuario = usuarioId },
            cancellationToken: cancellationToken));
    }

    private static decimal ToDecimal(System.Text.Json.JsonElement element) =>
        element.ValueKind == System.Text.Json.JsonValueKind.String
            ? decimal.Parse(element.GetString()!, System.Globalization.CultureInfo.InvariantCulture)
            : element.GetDecimal();

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
