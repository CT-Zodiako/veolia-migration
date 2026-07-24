using System.Data.Common;
using Dapper;
using Veolia.Api.Contracts.Proyecciones;

namespace Veolia.Api.Infrastructure.Data;

public sealed class CrecimientoRepository(IOracleConnectionFactory connectionFactory) : ICrecimientoRepository
{
    public async Task<CrecimientoDriveConfig?> GetDriveConfigAsync(long apsaId, CancellationToken cancellationToken)
    {
        // Legacy real (proyeccionescontroller.consultarcrecimiento): "SELECT * FROM
        // PROY_CRECIMIENTO_VBLES WHERE APSA_ID = :1", toma la primera fila. ID_ARCHIVO es el
        // spreadsheetId de Google y LISTA_HOJAS un CSV con los nombres de pestaña a leer.
        const string sql = @"
            SELECT ID_ARCHIVO AS IdArchivo,
                   LISTA_HOJAS AS ListaHojas
              FROM PROY_CRECIMIENTO_VBLES
             WHERE APSA_ID = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", apsaId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        return await connection.QueryFirstOrDefaultAsync<CrecimientoDriveConfig>(sql, parameters);
    }

    public async Task<CrecimientoPayload> ConsultarAsync(long proyId, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);

        var payload = new CrecimientoPayload
        {
            Usuarios = (await connection.QueryAsync<CrecimientoUsuariosItem>(SqlUsuarios,
                new DynamicParameters(new Dictionary<string, object?> { ["1"] = proyId }))).ToList(),
            Propia = (await connection.QueryAsync<CrecimientoPropiaItem>(SqlPropia,
                new DynamicParameters(new Dictionary<string, object?> { ["1"] = proyId }))).ToList(),
            Terceros = (await connection.QueryAsync<CrecimientoTercerosItem>(SqlTerceros,
                new DynamicParameters(new Dictionary<string, object?> { ["1"] = proyId }))).ToList(),
            Descuentos = (await connection.QueryAsync<DescuentosItem>(SqlDescuentos,
                new DynamicParameters(new Dictionary<string, object?> { ["1"] = proyId }))).ToList()
        };

        return payload;
    }

    public Task<MutationResponse> RegistrarUsuariosAsync(CrecimientoUsuariosRequest request, long usuarioId, CancellationToken cancellationToken)
        => ReplaceUsuariosAsync(request, usuarioId, cancellationToken);

    public Task<MutationResponse> RegistrarPropiaAsync(CrecimientoPropiaRequest request, long usuarioId, CancellationToken cancellationToken)
        => ReplacePropiaAsync(request, usuarioId, cancellationToken);

    public Task<MutationResponse> RegistrarTercerosAsync(CrecimientoTercerosRequest request, long usuarioId, CancellationToken cancellationToken)
        => ReplaceTercerosAsync(request, usuarioId, cancellationToken);

    public Task<MutationResponse> RegistrarDescuentosAsync(DescuentosRequest request, long usuarioId, CancellationToken cancellationToken)
        => ReplaceDescuentosAsync(request, usuarioId, cancellationToken);

    // --------------------------------------------------------------------
    // SELECT -- columnas reales confirmadas contra proyeccionescontroller.js
    // (consultarproyeccionusuario / consultarproyeccioninfopropia /
    // consultarproyeccioninfotercero / consultarproyecciondescuentos).
    // Ninguna de estas 4 tablas tiene ID sustituto.
    // --------------------------------------------------------------------

    private const string SqlUsuarios = @"
        SELECT ANNO AS Anno,
               SEMESTRE AS Semestre,
               CODUSO AS Coduso,
               NOMCLASEUSO AS Nomclaseuso,
               CODFACTOR AS Codfactor,
               VALORFACTOR AS Valorfactor,
               CODTIPOPRED AS Codtipopred,
               NOMTIPOPRED AS Nomtipopred,
               CANTIDAD AS Cantidad,
               TONELADAS AS Toneladas
          FROM PROY_USUARIOS
         WHERE PROY_ID = :1
         ORDER BY ANNO, SEMESTRE, CODTIPOPRED, CODUSO";

    private const string SqlPropia = @"
        SELECT NOM_APS AS NomAps,
               COD_EMPRESA AS CodEmpresa,
               NOM_EMPRESA AS NomEmpresa,
               ANNO AS Anno,
               MES AS Mes,
               V_DISPTERC AS VDispterc,
               IAT AS Iat,
               V_N AS VN,
               V_NA AS VNa,
               V_ND AS VNd,
               V_TAFNA AS VTafna,
               V_QRT AS VQrt,
               V_QLU AS VQlu,
               V_QNA AS VQna,
               V_QBL AS VQbl,
               V_QR AS VQr,
               V_QRS AS VQrs,
               V_CBLJ AS VCblj,
               V_LBL AS VLbl,
               V_VALOR_MTS3 AS VValorMts3,
               V_M2CC AS VM2cc,
               V_M2LAV AS VM2lav,
               V_TI AS VTi,
               V_TM AS VTm,
               V_KLP AS VKlp,
               V_VL AS VVl,
               V_ESCENARIO AS VEscenario,
               V_CTLMX AS VCtlmx,
               V_T AS VT,
               V_CPE AS VCpe,
               V_VA_CRT AS VVaCrt,
               V_VA_CRT_ABC AS VVaCrtAbc,
               V_VA_CDF AS VVaCdf,
               V_VA_CDF_ABC AS VVaCdfAbc,
               V_NAA AS VNaa,
               V_QA AS VQa,
               V_TAFA AS VTafa,
               V_CP AS VCp,
               V_CRT_PROPIO AS VCrtPropio,
               V_CDF_FACTURADO AS VCdfFacturado,
               V_QRTZ AS VQrtz,
               V_CDF_TERCERO AS VCdfTercero,
               V_CTL_TERCERO AS VCtlTercero,
               V_IR_TERCERO AS VIrTercero,
               V_QRS_MUNRECP AS VQrsMunrecp
          FROM PROY_PROPIA
         WHERE PROY_ID = :1
         ORDER BY ANNO, MES";

    private const string SqlTerceros = @"
        SELECT NOM_APS AS NomAps,
               COD_EMPRESA AS CodEmpresa,
               NOM_EMPRESA AS NomEmpresa,
               ANNO AS Anno,
               MES AS Mes,
               C_N AS CN,
               C_NA AS CNa,
               C_ND AS CNd,
               C_TAFNA AS CTafna,
               C_VALOR_MTS3 AS CValorMts3,
               C_QRT AS CQrt,
               C_QLU AS CQlu,
               C_QNA AS CQna,
               C_QBL AS CQbl,
               C_QRECHAZO AS CQrechazo,
               C_QRS AS CQrs,
               C_CBLJ AS CCblj,
               C_LBL AS CLbl,
               C_M2CC AS CM2cc,
               C_M2LAV AS CM2lav,
               C_TI AS CTi,
               C_TM AS CTm,
               C_KLP AS CKlp,
               C_VL AS CVl,
               C_ESCENARIO AS CEscenario,
               C_T AS CT,
               C_CPE AS CCpe,
               C_CTLMX AS CCtlmx,
               C_VA_CRT AS CVaCrt,
               C_VA_CRT_ABC AS CVaCrtAbc,
               C_VA_CDF AS CVaCdf,
               C_VA_CDF_ABC AS CVaCdfAbc,
               C_NAA AS CNaa,
               C_QA AS CQa,
               C_TAFA AS CTafa,
               C_CRT_COMPETIDOR AS CCrtCompetidor,
               C_CDF_COMPETIDOR AS CCdfCompetidor,
               C_QRTZ AS CQrtz,
               C_CTL_SIN_INCENTIVO AS CCtlSinIncentivo,
               C_INCENTIVO AS CIncentivo,
               C_CDFSINCENTIVO AS CCdfsincentivo,
               C_CPODA AS CCpoda
          FROM PROY_COMPETIDOR
         WHERE PROY_ID = :1
         ORDER BY COD_EMPRESA, ANNO, MES";

    private const string SqlDescuentos = @"
        SELECT NOM_APS AS NomAps,
               ANNO AS Anno,
               MES AS Mes,
               D_CCS AS Dccs,
               D_CBL AS Dcbl,
               D_CLUS AS Dclus,
               D_CRT AS Dcrt,
               D_CDF AS Dcdf,
               D_CTL AS Dctl,
               D_VBA AS Dvba
          FROM PROY_DESCUENTOS
         WHERE PROY_ID = :1
         ORDER BY ANNO, MES";

    // --------------------------------------------------------------------
    // REPLACE (delete + insert) -- mismo patrón que el legacy Node
    // (DELETE por PROY_ID [+ COD_APS] seguido de INSERT masivo). Acá se hace
    // fila por fila dentro de una transacción en vez del truco Oracle
    // "INSERT ALL ... SELECT 1 FROM DUAL" que usa el Node driver.
    // --------------------------------------------------------------------

    private async Task<MutationResponse> ReplaceUsuariosAsync(CrecimientoUsuariosRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "DELETE FROM PROY_USUARIOS WHERE PROY_ID = :1 AND COD_APS = :2",
                new DynamicParameters(new Dictionary<string, object?> { ["1"] = request.ProyId, ["2"] = request.ApsaId }),
                transaction: transaction, cancellationToken: cancellationToken));

            const string insertSql = @"
                INSERT INTO PROY_USUARIOS
                (PROY_ID, COD_APS, ANNO, SEMESTRE, CODUSO, NOMCLASEUSO, CODFACTOR, VALORFACTOR, CODTIPOPRED, NOMTIPOPRED, CANTIDAD, TONELADAS, FECHACREA, USUARIO)
                VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12, SYSDATE, :13)";

            foreach (var item in request.Items)
            {
                var parameters = new DynamicParameters();
                parameters.Add("1", request.ProyId);
                parameters.Add("2", request.ApsaId);
                parameters.Add("3", item.Anno);
                parameters.Add("4", item.Semestre);
                parameters.Add("5", item.Coduso);
                parameters.Add("6", item.Nomclaseuso);
                parameters.Add("7", item.Codfactor);
                parameters.Add("8", item.Valorfactor);
                parameters.Add("9", item.Codtipopred);
                parameters.Add("10", item.Nomtipopred);
                parameters.Add("11", item.Cantidad);
                parameters.Add("12", item.Toneladas);
                parameters.Add("13", usuarioId);
                await connection.ExecuteAsync(new CommandDefinition(insertSql, parameters, transaction: transaction, cancellationToken: cancellationToken));
            }

            transaction.Commit();
            return new MutationResponse { Success = true, Message = "Crecimiento de usuarios guardado.", Id = request.ProyId };
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            return new MutationResponse { Success = false, Message = $"Error al guardar usuarios: {ex.Message}", Id = request.ProyId };
        }
    }

    private async Task<MutationResponse> ReplacePropiaAsync(CrecimientoPropiaRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "DELETE FROM PROY_PROPIA WHERE PROY_ID = :1 AND COD_APS = :2",
                new DynamicParameters(new Dictionary<string, object?> { ["1"] = request.ProyId, ["2"] = request.ApsaId }),
                transaction: transaction, cancellationToken: cancellationToken));

            const string insertSql = @"
                INSERT INTO PROY_PROPIA
                (PROY_ID, COD_APS, NOM_APS, COD_EMPRESA, NOM_EMPRESA, ANNO, MES, V_DISPTERC, IAT, V_N, V_NA, V_ND, V_TAFNA, V_QRT, V_QLU, V_QNA, V_QBL, V_QR, V_QRS, V_CBLJ, V_LBL, V_VALOR_MTS3, V_M2CC, V_M2LAV, V_TI, V_TM, V_KLP, V_VL, V_ESCENARIO, V_CTLMX, V_T, V_CPE, V_VA_CRT, V_VA_CRT_ABC, V_VA_CDF, V_VA_CDF_ABC, V_NAA, V_QA, V_TAFA, V_CP, V_CRT_PROPIO, V_CDF_FACTURADO, V_QRTZ, V_CDF_TERCERO, V_CTL_TERCERO, V_IR_TERCERO, FECHACREA, USUARIO, V_QRS_MUNRECP)
                VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12, :13, :14, :15, :16, :17, :18, :19, :20, :21, :22, :23, :24, :25, :26, :27, :28, :29, :30, :31, :32, :33, :34, :35, :36, :37, :38, :39, :40, :41, :42, :43, :44, :45, :46, SYSDATE, :47, :48)";

            foreach (var item in request.Items)
            {
                var parameters = new DynamicParameters();
                parameters.Add("1", request.ProyId);
                parameters.Add("2", request.ApsaId);
                parameters.Add("3", item.NomAps);
                parameters.Add("4", item.CodEmpresa);
                parameters.Add("5", item.NomEmpresa);
                parameters.Add("6", item.Anno);
                parameters.Add("7", item.Mes);
                parameters.Add("8", item.VDispterc);
                parameters.Add("9", item.Iat);
                parameters.Add("10", item.VN);
                parameters.Add("11", item.VNa);
                parameters.Add("12", item.VNd);
                parameters.Add("13", item.VTafna);
                parameters.Add("14", item.VQrt);
                parameters.Add("15", item.VQlu);
                parameters.Add("16", item.VQna);
                parameters.Add("17", item.VQbl);
                parameters.Add("18", item.VQr);
                parameters.Add("19", item.VQrs);
                parameters.Add("20", item.VCblj);
                parameters.Add("21", item.VLbl);
                parameters.Add("22", item.VValorMts3);
                parameters.Add("23", item.VM2cc);
                parameters.Add("24", item.VM2lav);
                parameters.Add("25", item.VTi);
                parameters.Add("26", item.VTm);
                parameters.Add("27", item.VKlp);
                parameters.Add("28", item.VVl);
                parameters.Add("29", item.VEscenario);
                parameters.Add("30", item.VCtlmx);
                parameters.Add("31", item.VT);
                parameters.Add("32", item.VCpe);
                parameters.Add("33", item.VVaCrt);
                parameters.Add("34", item.VVaCrtAbc);
                parameters.Add("35", item.VVaCdf);
                parameters.Add("36", item.VVaCdfAbc);
                parameters.Add("37", item.VNaa);
                parameters.Add("38", item.VQa);
                parameters.Add("39", item.VTafa);
                parameters.Add("40", item.VCp);
                parameters.Add("41", item.VCrtPropio);
                parameters.Add("42", item.VCdfFacturado);
                parameters.Add("43", item.VQrtz);
                parameters.Add("44", item.VCdfTercero);
                parameters.Add("45", item.VCtlTercero);
                parameters.Add("46", item.VIrTercero);
                parameters.Add("47", usuarioId);
                parameters.Add("48", item.VQrsMunrecp);
                await connection.ExecuteAsync(new CommandDefinition(insertSql, parameters, transaction: transaction, cancellationToken: cancellationToken));
            }

            transaction.Commit();
            return new MutationResponse { Success = true, Message = "Crecimiento de información propia guardado.", Id = request.ProyId };
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            return new MutationResponse { Success = false, Message = $"Error al guardar info propia: {ex.Message}", Id = request.ProyId };
        }
    }

    private async Task<MutationResponse> ReplaceTercerosAsync(CrecimientoTercerosRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "DELETE FROM PROY_COMPETIDOR WHERE PROY_ID = :1 AND COD_APS = :2",
                new DynamicParameters(new Dictionary<string, object?> { ["1"] = request.ProyId, ["2"] = request.ApsaId }),
                transaction: transaction, cancellationToken: cancellationToken));

            const string insertSql = @"
                INSERT INTO PROY_COMPETIDOR
                (PROY_ID, COD_APS, NOM_APS, COD_EMPRESA, NOM_EMPRESA, ANNO, MES, C_N, C_NA, C_ND, C_TAFNA, C_VALOR_MTS3, C_QRT, C_QLU, C_QNA, C_QBL, C_QRECHAZO, C_QRS, C_CBLJ, C_LBL, C_M2CC, C_M2LAV, C_TI, C_TM, C_KLP, C_VL, C_ESCENARIO, C_T, C_CPE, C_CTLMX, C_VA_CRT, C_VA_CRT_ABC, C_VA_CDF, C_VA_CDF_ABC, C_NAA, C_QA, C_TAFA, C_CRT_COMPETIDOR, C_CDF_COMPETIDOR, C_QRTZ, C_CTL_SIN_INCENTIVO, C_INCENTIVO, C_CDFSINCENTIVO, C_CPODA, FECHACREA, USUARIO)
                VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12, :13, :14, :15, :16, :17, :18, :19, :20, :21, :22, :23, :24, :25, :26, :27, :28, :29, :30, :31, :32, :33, :34, :35, :36, :37, :38, :39, :40, :41, :42, :43, :44, SYSDATE, :45)";

            foreach (var item in request.Items)
            {
                var parameters = new DynamicParameters();
                parameters.Add("1", request.ProyId);
                parameters.Add("2", request.ApsaId);
                parameters.Add("3", item.NomAps);
                parameters.Add("4", item.CodEmpresa);
                parameters.Add("5", item.NomEmpresa);
                parameters.Add("6", item.Anno);
                parameters.Add("7", item.Mes);
                parameters.Add("8", item.CN);
                parameters.Add("9", item.CNa);
                parameters.Add("10", item.CNd);
                parameters.Add("11", item.CTafna);
                parameters.Add("12", item.CValorMts3);
                parameters.Add("13", item.CQrt);
                parameters.Add("14", item.CQlu);
                parameters.Add("15", item.CQna);
                parameters.Add("16", item.CQbl);
                parameters.Add("17", item.CQrechazo);
                parameters.Add("18", item.CQrs);
                parameters.Add("19", item.CCblj);
                parameters.Add("20", item.CLbl);
                parameters.Add("21", item.CM2cc);
                parameters.Add("22", item.CM2lav);
                parameters.Add("23", item.CTi);
                parameters.Add("24", item.CTm);
                parameters.Add("25", item.CKlp);
                parameters.Add("26", item.CVl);
                parameters.Add("27", item.CEscenario);
                parameters.Add("28", item.CT);
                parameters.Add("29", item.CCpe);
                parameters.Add("30", item.CCtlmx);
                parameters.Add("31", item.CVaCrt);
                parameters.Add("32", item.CVaCrtAbc);
                parameters.Add("33", item.CVaCdf);
                parameters.Add("34", item.CVaCdfAbc);
                parameters.Add("35", item.CNaa);
                parameters.Add("36", item.CQa);
                parameters.Add("37", item.CTafa);
                parameters.Add("38", item.CCrtCompetidor);
                parameters.Add("39", item.CCdfCompetidor);
                parameters.Add("40", item.CQrtz);
                parameters.Add("41", item.CCtlSinIncentivo);
                parameters.Add("42", item.CIncentivo);
                parameters.Add("43", item.CCdfsincentivo);
                parameters.Add("44", item.CCpoda);
                parameters.Add("45", usuarioId);
                await connection.ExecuteAsync(new CommandDefinition(insertSql, parameters, transaction: transaction, cancellationToken: cancellationToken));
            }

            transaction.Commit();
            return new MutationResponse { Success = true, Message = "Crecimiento de terceros guardado.", Id = request.ProyId };
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            return new MutationResponse { Success = false, Message = $"Error al guardar info terceros: {ex.Message}", Id = request.ProyId };
        }
    }

    private async Task<MutationResponse> ReplaceDescuentosAsync(DescuentosRequest request, long usuarioId, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            await connection.ExecuteAsync(new CommandDefinition(
                "DELETE FROM PROY_DESCUENTOS WHERE PROY_ID = :1",
                new DynamicParameters(new Dictionary<string, object?> { ["1"] = request.ProyId }),
                transaction: transaction, cancellationToken: cancellationToken));

            const string insertSql = @"
                INSERT INTO PROY_DESCUENTOS
                (PROY_ID, COD_APS, NOM_APS, ANNO, MES, D_CCS, D_CBL, D_CLUS, D_CRT, D_CDF, D_CTL, D_VBA, FECHACREA, USUARIO)
                VALUES (:1, :2, :3, :4, :5, :6, :7, :8, :9, :10, :11, :12, SYSDATE, :13)";

            foreach (var item in request.Items)
            {
                var parameters = new DynamicParameters();
                parameters.Add("1", request.ProyId);
                parameters.Add("2", request.ApsaId);
                parameters.Add("3", item.NomAps);
                parameters.Add("4", item.Anno);
                parameters.Add("5", item.Mes);
                parameters.Add("6", item.Dccs);
                parameters.Add("7", item.Dcbl);
                parameters.Add("8", item.Dclus);
                parameters.Add("9", item.Dcrt);
                parameters.Add("10", item.Dcdf);
                parameters.Add("11", item.Dctl);
                parameters.Add("12", item.Dvba);
                parameters.Add("13", usuarioId);
                await connection.ExecuteAsync(new CommandDefinition(insertSql, parameters, transaction: transaction, cancellationToken: cancellationToken));
            }

            transaction.Commit();
            return new MutationResponse { Success = true, Message = "Descuentos guardados.", Id = request.ProyId };
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            return new MutationResponse { Success = false, Message = $"Error al guardar descuentos: {ex.Message}", Id = request.ProyId };
        }
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
