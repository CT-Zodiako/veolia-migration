using System.Text.Json;
using Dapper;
using Oracle.ManagedDataAccess.Client;
using Veolia.Api.Contracts.Reliquidacion;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Infrastructure.Data;

public sealed class ReliqCargueRepository(IOracleConnectionFactory connectionFactory) : IReliqCargueRepository
{
    public async Task<string?> CompararCostosCargueAsync(long reliq, long apsaId, CancellationToken cancellationToken)
    {
        const string sql = @"
            BEGIN
                :1 := PK_RELIQUIDAR.freli_reliquidar(:2, :3);
            END;";

        var parameters = new DynamicParameters();
        parameters.Add("1", dbType: System.Data.DbType.String, size: 4000, direction: System.Data.ParameterDirection.Output);
        parameters.Add("2", reliq);
        parameters.Add("3", apsaId);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return parameters.Get<string>("1");
    }

    public async Task<IReadOnlyList<CompararCostosResponseDto>> CompararCostosAsync(long reliq, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT COD_RELIQ AS CodReliq,
                   APSA_ID AS ApsaId,
                   RELQDESDE AS RelqDesde,
                   RELQHASTA AS RelqHasta,
                   COSTO_APS AS CostoAps,
                   COSTO_EMPRESA AS CostoEmpresa,
                   DIF_COSTO AS DifCosto
              FROM VREL_COMPARACOSTOS
             WHERE COD_RELIQ = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", reliq);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<CompararCostosResponseDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<CompararTarifasResponseDto>> CompararTarifasAsync(long reliq, CancellationToken cancellationToken)
    {
        // Columnas confirmadas contra el legacy Vue (front-tarificador/src/reliq/views/CompararTarifas.vue,
        // líneas 65-637): la vista no expone RELI/APSA_ID/TARIFA_APS/TARIFA_EMPRESA/DIF_TARIFA (no existen
        // en ninguna fuente documentada), sino tríos ORIG/REL/DIF por componente tarifario.
        const string sql = @"
            SELECT MES AS Mes,
                   ANNO AS Anno,
                   CLAS_NOMBRE AS ClasNombre,
                   PARA_NOMBRE AS ParaNombre,
                   FAPR_NOMBRE AS FaprNombre,
                   TC_ORIG AS TcOrig,
                   TC_REL AS TcRel,
                   TC_DIF AS TcDif,
                   TCAPROV_ORIG AS TcaprovOrig,
                   TCAPROV_REL AS TcaprovRel,
                   TCAPROV_DIF AS TcaprovDif,
                   TCADD_ORIG AS TcaddOrig,
                   TCADD_REL AS TcaddRel,
                   TCADD_DIF AS TcaddDif,
                   TCADDAPROV_ORIG AS TcaddaprovOrig,
                   TCADDAPROV_REL AS TcaddaprovRel,
                   TCADDAPROV_DIF AS TcaddaprovDif,
                   TBL_ORIG AS TblOrig,
                   TBL_REL AS TblRel,
                   TBL_DIF AS TblDif,
                   TLU_ORIG AS TluOrig,
                   TLU_REL AS TluRel,
                   TLU_DIF AS TluDif,
                   TRT_ORIG AS TrtOrig,
                   TRT_REL AS TrtRel,
                   TRT_DIF AS TrtDif,
                   TDF_ORIG AS TdfOrig,
                   TDF_REL AS TdfRel,
                   TDF_DIF AS TdfDif,
                   TTL_ORIG AS TtlOrig,
                   TTL_REL AS TtlRel,
                   TTL_DIF AS TtlDif,
                   TA_ORIG AS TaOrig,
                   TA_REL AS TaRel,
                   TA_DIF AS TaDif,
                   TAR_PLENA_ENE_ORG AS TarPlenaEneOrg,
                   TAR_PLENA_ENE_REL AS TarPlenaEneRel,
                   DEVOLENE AS Devolene,
                   TAR_PLENA_ACU_ORG AS TarPlenaAcuOrg,
                   TAR_PLENA_ACU_REL AS TarPlenaAcuRel,
                   DEVOLACU AS Devolacu
              FROM VREL_COMPARATARIFACOBRO
             WHERE RELI = :1";

        var parameters = new DynamicParameters();
        parameters.Add("1", reliq);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<CompararTarifasResponseDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<ResumenCompararTarifasResponseDto?> ResumenCompararTarifasAsync(long reliq, long apsaId, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT reliq.PK_JSONRESUMEN.freli_jsongral(:1,:2,:3,:4) AS json_trna
              FROM dual";

        var parameters = new DynamicParameters();
        parameters.Add("1", reliq);
        parameters.Add("2", apsaId);
        parameters.Add("3", anno);
        parameters.Add("4", mes);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var row = await connection.QueryFirstOrDefaultAsync<ResumenRow>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        if (row is null || string.IsNullOrWhiteSpace(row.JsonTrna))
            return null;

        return ParseResumenCompararTarifas(row.JsonTrna);
    }

    // El legacy (CompararTarifas.vue líneas 755-777 y GenericTable.vue líneas 88-104) consume el JSON
    // con claves en minúscula "periodo"/"dataset", y cada bloque del dataset con "nombre" u opcionalmente
    // "grup" como leyenda, más "columns" (encabezados) y "data" (matriz fila x columna). Se parsea así,
    // preservando la estructura dinámica en vez de forzar columnas fijas que no existen.
    private static ResumenCompararTarifasResponseDto ParseResumenCompararTarifas(string json)
    {
        using var doc = JsonDocument.Parse(json);
        var root = doc.RootElement;

        var periodo = root.TryGetProperty("periodo", out var periodoEl) && periodoEl.ValueKind == JsonValueKind.String
            ? periodoEl.GetString()
            : null;

        var dataset = new List<ResumenCompararTarifasDatasetItemDto>();
        if (root.TryGetProperty("dataset", out var datasetEl) && datasetEl.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in datasetEl.EnumerateArray())
            {
                var nombre = item.TryGetProperty("nombre", out var nombreEl) && nombreEl.ValueKind == JsonValueKind.String
                    ? nombreEl.GetString()
                    : item.TryGetProperty("grup", out var grupEl) && grupEl.ValueKind == JsonValueKind.String
                        ? grupEl.GetString()
                        : null;

                var columns = new List<string>();
                if (item.TryGetProperty("columns", out var columnsEl) && columnsEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var col in columnsEl.EnumerateArray())
                    {
                        columns.Add(col.ValueKind == JsonValueKind.String ? col.GetString() ?? string.Empty : col.GetRawText());
                    }
                }

                var data = new List<List<object?>>();
                if (item.TryGetProperty("data", out var dataEl) && dataEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var dataRow in dataEl.EnumerateArray())
                    {
                        var rowValues = new List<object?>();
                        if (dataRow.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var cell in dataRow.EnumerateArray())
                            {
                                rowValues.Add(ConvertJsonValue(cell));
                            }
                        }

                        data.Add(rowValues);
                    }
                }

                dataset.Add(new ResumenCompararTarifasDatasetItemDto { Nombre = nombre, Columns = columns, Data = data });
            }
        }

        return new ResumenCompararTarifasResponseDto { Periodo = periodo, Dataset = dataset };
    }

    private static object? ConvertJsonValue(JsonElement element) => element.ValueKind switch
    {
        JsonValueKind.String => element.GetString(),
        JsonValueKind.Number => element.TryGetDecimal(out var dec) ? dec : element.GetDouble(),
        JsonValueKind.True => true,
        JsonValueKind.False => false,
        JsonValueKind.Null or JsonValueKind.Undefined => null,
        _ => element.GetRawText()
    };

    public async Task<IReadOnlyList<ReliInfoUsuariosDto>> GetReliInfoUsuariosAsync(long idReliq, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT U.IUAE_ID AS IuaeId,
                   U.RELI_ID AS ReliId,
                   U.IUAE_ANNO AS Anno,
                   U.IUAE_MES AS Mes,
                   U.DIVI_DIVI AS DiviDivi,
                   U.CLAS_CLASEUSO AS ClasClaseUso,
                   U.PARA_TIPTAR20012 AS ParaTipTar20012,
                   U.PARA_UBICACION20016 AS ParaUbicacion20016,
                   U.PARA_TIPFAC20014 AS ParaTipFac20014,
                   U.FAPR_CODIGO AS FaprCodigo,
                   U.IUAE_CANTIDAD AS Cantidad,
                   U.IUAE_TONELADAS AS Toneladas
              FROM RELI_INFUSUAPSEMPRDIVI U
             WHERE U.RELI_ID = :1
             ORDER BY U.IUAE_ANNO, U.IUAE_MES";

        var parameters = new DynamicParameters();
        parameters.Add("1", idReliq);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ReliInfoUsuariosDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<ReliInfoEmpresaDto>> GetResumenEmpresaAsync(long idReliq, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT I.INED_ID AS InedId,
                   I.RELI_ID AS ReliId,
                   I.INED_ANNO AS Anno,
                   I.INED_MES AS Mes,
                   E.EMPR_NOMBRE AS EmpresaNombre,
                   I.INED_CBLJ AS Cblj,
                   I.INED_LBLJ AS Lblj,
                   I.INED_N AS N,
                   I.INED_M3AGUA AS M3agua,
                   I.INED_CP AS Cp,
                   I.INED_M2CCJ AS M2ccj,
                   I.INED_M2LAVJ AS M2lavj,
                   I.INED_TIJ AS Tij,
                   I.INED_KLPJ AS Klpj,
                   I.INED_TMJ AS Tmj,
                   I.INED_CLAVJ AS Clavj,
                   I.INED_QRTJ AS Qrtj,
                   I.INED_QRSJ AS Qrsj
              FROM RELI_INFOEMPRDIVI I
              JOIN AUGE_EMPRESAS E ON E.EMPR_EMPR = I.EMPR_EMPR
             WHERE I.RELI_ID = :1
             ORDER BY E.EMPR_NOMBRE";

        var parameters = new DynamicParameters();
        parameters.Add("1", idReliq);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ReliInfoEmpresaDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<ReliInfoApsDto>> GetResumenApsAsync(long idReliq, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT I.IAED_ID AS IaedId,
                   I.RELI_ID AS ReliId,
                   I.IAED_ANNO AS Anno,
                   I.IAED_MES AS Mes,
                   E.EMPR_NOMBRE AS EmpresaNombre,
                   I.DIVI_DIVI AS DiviDivi,
                   I.IAED_QRTZ AS Qrtz,
                   I.IAED_CPE AS Cpe,
                   I.IAED_T AS T,
                   I.IAED_VACRTABC AS VacrtAbc,
                   I.IAED_VACRT AS Vacrt,
                   I.IAED_CRTZ AS Crtz,
                   I.IAED_QBL AS Qbl,
                   I.IAED_QLU AS Qlu,
                   I.IAED_QR AS Qr,
                   I.IAED_TAFA AS Tafa,
                   I.IAED_ND AS Nd,
                   I.IAED_NA AS Na,
                   I.IAED_QNA AS Qna,
                   I.IAED_TAFNA AS Tafna,
                   I.IAED_QA AS Qa,
                   I.IAED_APROVECHA AS Aprovecha,
                   I.IAED_QALMACEN AS Qalmacen,
                   I.IAED_CPEET AS Cpeet,
                   I.IAED_QRTET AS Qrtet,
                   I.IAED_CRTCOMP AS Crtcomp,
                   I.IAED_CDFCOMP AS Cdfcomp,
                   I.IAED_QRSCOMP AS Qrscomp,
                   I.IAED_NAA AS Naa,
                   I.IAED_NDA AS Nda
              FROM RELI_INFOAPSEMPRDIVI I
              JOIN AUGE_EMPRESAS E ON E.EMPR_EMPR = I.EMPR_EMPR
             WHERE I.RELI_ID = :1
             ORDER BY E.EMPR_NOMBRE";

        var parameters = new DynamicParameters();
        parameters.Add("1", idReliq);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ReliInfoApsDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<ReliInfoRellenoDto>> GetResumenRellenoAsync(long idReliq, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT R.IARE_ID AS IareId,
                   R.RELI_ID AS ReliId,
                   R.IARE_ANNO AS Anno,
                   R.IARE_MES AS Mes,
                   R.IARE_QRS AS Qrs,
                   R.IARE_C AS C,
                   R.IARE_VL AS Vl,
                   R.IARE_CTMLX AS Ctmlx,
                   R.IARE_CTLK AS Ctlk,
                   R.IARE_ESCENARIO AS Escenario,
                   R.IARE_CDFK AS Cdfk,
                   R.IARE_VACDFABC AS VacdfAbc,
                   R.IARE_VACDF AS Vacdf,
                   R.IARE_VACTLABC AS VactlAbc,
                   R.IARE_VACTL AS Vactl
              FROM RELI_INFOAPSRELLENO R
             WHERE R.RELI_ID = :1
             ORDER BY R.IARE_ANNO, R.IARE_MES";

        var parameters = new DynamicParameters();
        parameters.Add("1", idReliq);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ReliInfoRellenoDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<ReliInfoAdicionalDto>> GetReliInfoAdicionalAsync(long idReliq, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT A.CEAD_ID AS CeadId,
                   A.RELI_ID AS ReliId,
                   A.CEAD_ANNO AS Anno,
                   A.CEAD_MES AS Mes,
                   A.CEAD_CDF AS Cdf,
                   A.CEAD_CTL AS Ctl
              FROM RELI_INFOADICIONAL A
             WHERE A.RELI_ID = :1
             ORDER BY A.CEAD_ANNO, A.CEAD_MES";

        var parameters = new DynamicParameters();
        parameters.Add("1", idReliq);

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ReliInfoAdicionalDto>(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public Task<int> UpdateReliInfoUsuariosAsync(IReadOnlyList<UpdateReliInfoUsuariosRequestDto> items, long userId, CancellationToken cancellationToken)
        => ExecuteBatchUpdateAsync(
            @"UPDATE RELI_INFUSUAPSEMPRDIVI
                 SET DIVI_DIVI = :1,
                     FAPR_CODIGO = :2,
                     CLAS_CLASEUSO = :3,
                     PARA_TIPTAR20012 = :4,
                     IUAE_CANTIDAD = :5,
                     IUAE_TONELADAS = :6,
                     PARA_UBICACION20016 = :7,
                     PARA_TIPFAC20014 = :8
               WHERE IUAE_ID = :9
                 AND RELI_ID = :10",
            items,
            userId,
            (parameters, row, _) =>
            {
                parameters.Add("1", row.DiviDivi);
                parameters.Add("2", row.FaprCodigo);
                parameters.Add("3", row.ClasClaseUso);
                parameters.Add("4", row.ParaTipTar20012);
                parameters.Add("5", row.Cantidad);
                parameters.Add("6", row.Toneladas);
                parameters.Add("7", row.ParaUbicacion20016);
                parameters.Add("8", row.ParaTipFac20014);
                parameters.Add("9", row.IuaeId);
                parameters.Add("10", row.ReliId);
            },
            cancellationToken);

    public Task<int> UpdateResumenEmpresaAsync(IReadOnlyList<UpdateResumenEmpresaRequestDto> items, long userId, CancellationToken cancellationToken)
        => ExecuteBatchUpdateAsync(
            @"UPDATE RELI_INFOEMPRDIVI
                 SET INED_CBLJ = :1,
                     INED_LBLJ = :2,
                     INED_N = :3,
                     INED_M3AGUA = :4,
                     INED_CP = :5,
                     INED_M2CCJ = :6,
                     INED_M2LAVJ = :7,
                     INED_TIJ = :8,
                     INED_KLPJ = :9,
                     INED_TMJ = :10,
                     INED_CLAVJ = :11,
                     INED_QRTJ = :12,
                     INED_QRSJ = :13
               WHERE INED_ID = :14
                 AND RELI_ID = :15",
            items,
            userId,
            (parameters, row, _) =>
            {
                parameters.Add("1", row.Cblj);
                parameters.Add("2", row.Lblj);
                parameters.Add("3", row.N);
                parameters.Add("4", row.M3agua);
                parameters.Add("5", row.Cp);
                parameters.Add("6", row.M2ccj);
                parameters.Add("7", row.M2lavj);
                parameters.Add("8", row.Tij);
                parameters.Add("9", row.Klpj);
                parameters.Add("10", row.Tmj);
                parameters.Add("11", row.Clavj);
                parameters.Add("12", row.Qrtj);
                parameters.Add("13", row.Qrsj);
                parameters.Add("14", row.InedId);
                parameters.Add("15", row.ReliId);
            },
            cancellationToken);

    public Task<int> UpdateResumenApsAsync(IReadOnlyList<UpdateResumenApsRequestDto> items, long userId, CancellationToken cancellationToken)
        => ExecuteBatchUpdateAsync(
            @"UPDATE RELI_INFOAPSEMPRDIVI
                 SET DIVI_DIVI = :1,
                     IAED_QRTZ = :2,
                     IAED_CPE = :3,
                     IAED_T = :4,
                     IAED_VACRTABC = :5,
                     IAED_VACRT = :6,
                     IAED_CRTZ = :7,
                     IAED_QBL = :8,
                     IAED_QLU = :9,
                     IAED_QR = :10,
                     IAED_TAFA = :11,
                     IAED_ND = :12,
                     IAED_NA = :13,
                     IAED_QNA = :14,
                     IAED_TAFNA = :15,
                     IAED_QA = :16,
                     IAED_APROVECHA = :17,
                     IAED_QALMACEN = :18,
                     IAED_CPEET = :19,
                     IAED_QRTET = :20,
                     IAED_CRTCOMP = :21,
                     IAED_CDFCOMP = :22,
                     IAED_QRSCOMP = :23,
                     IAED_NAA = :24,
                     IAED_NDA = :25
               WHERE IAED_ID = :26
                 AND RELI_ID = :27",
            items,
            userId,
            (parameters, row, _) =>
            {
                parameters.Add("1", row.DiviDivi);
                parameters.Add("2", row.Qrtz);
                parameters.Add("3", row.Cpe);
                parameters.Add("4", row.T);
                parameters.Add("5", row.VacrtAbc);
                parameters.Add("6", row.Vacrt);
                parameters.Add("7", row.Crtz);
                parameters.Add("8", row.Qbl);
                parameters.Add("9", row.Qlu);
                parameters.Add("10", row.Qr);
                parameters.Add("11", row.Tafa);
                parameters.Add("12", row.Nd);
                parameters.Add("13", row.Na);
                parameters.Add("14", row.Qna);
                parameters.Add("15", row.Tafna);
                parameters.Add("16", row.Qa);
                parameters.Add("17", row.Aprovecha);
                parameters.Add("18", row.Qalmacen);
                parameters.Add("19", row.Cpeet);
                parameters.Add("20", row.Qrtet);
                parameters.Add("21", row.Crtcomp);
                parameters.Add("22", row.Cdfcomp);
                parameters.Add("23", row.Qrscomp);
                parameters.Add("24", row.Naa);
                parameters.Add("25", row.Nda);
                parameters.Add("26", row.IaedId);
                parameters.Add("27", row.ReliId);
            },
            cancellationToken);

    public Task<int> UpdateResumenRellenoAsync(IReadOnlyList<UpdateResumenRellenoRequestDto> items, long userId, CancellationToken cancellationToken)
        => ExecuteBatchUpdateAsync(
            @"UPDATE RELI_INFOAPSRELLENO
                 SET IARE_QRS = :1,
                     IARE_CDFK = :2,
                     IARE_VACDFABC = :3,
                     IARE_VACDF = :4,
                     IARE_VL = :5,
                     IARE_CTMLX = :6,
                     IARE_CTLK = :7,
                     IARE_VACTLABC = :8,
                     IARE_VACTL = :9,
                     IARE_ESCENARIO = :10,
                     IARE_C = :11
               WHERE IARE_ID = :12
                 AND RELI_ID = :13",
            items,
            userId,
            (parameters, row, _) =>
            {
                parameters.Add("1", row.Qrs);
                parameters.Add("2", row.Cdfk);
                parameters.Add("3", row.VacdfAbc);
                parameters.Add("4", row.Vacdf);
                parameters.Add("5", row.Vl);
                parameters.Add("6", row.Ctmlx);
                parameters.Add("7", row.Ctlk);
                parameters.Add("8", row.VactlAbc);
                parameters.Add("9", row.Vactl);
                parameters.Add("10", row.Escenario);
                parameters.Add("11", row.C);
                parameters.Add("12", row.IareId);
                parameters.Add("13", row.ReliId);
            },
            cancellationToken);

    public Task<int> UpdateResumenAdicionalAsync(IReadOnlyList<UpdateResumenAdicionalRequestDto> items, long userId, CancellationToken cancellationToken)
        => ExecuteBatchUpdateAsync(
            @"UPDATE RELI_INFOADICIONAL
                 SET CEAD_CDF = :1,
                     CEAD_CTL = :2
               WHERE CEAD_ID = :3
                 AND RELI_ID = :4",
            items,
            userId,
            (parameters, row, _) =>
            {
                parameters.Add("1", row.Cdf);
                parameters.Add("2", row.Ctl);
                parameters.Add("3", row.CeadId);
                parameters.Add("4", row.ReliId);
            },
            cancellationToken);

    private async Task<OracleConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        var connection = connectionFactory.CreateConnection();
        if (connection is not OracleConnection oracleConnection)
        {
            throw new InvalidOperationException("OracleConnectionFactory must return OracleConnection.");
        }

        if (oracleConnection.State != System.Data.ConnectionState.Open)
        {
            await oracleConnection.OpenAsync(cancellationToken);
        }

        return oracleConnection;
    }

    private sealed class ResumenRow
    {
        public string JsonTrna { get; set; } = string.Empty;
    }

    private async Task<int> ExecuteBatchUpdateAsync<T>(
        string sql,
        IReadOnlyList<T> items,
        long userId,
        Action<DynamicParameters, T, long> map,
        CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            var affected = 0;
            foreach (var item in items)
            {
                var parameters = new DynamicParameters();
                map(parameters, item, userId);
                affected += await connection.ExecuteAsync(new CommandDefinition(sql, parameters, transaction, cancellationToken: cancellationToken));
            }

            transaction.Commit();
            return affected;
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }
}
