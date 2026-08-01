using Dapper;
using Oracle.ManagedDataAccess.Client;
using System.Data;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Data.Interfaces;
using Veolia.Api.Modules.Regulator.Suministros;
using Veolia.Api.Modules.Regulator.Validaciones;

namespace Veolia.Api.Infrastructure.Data;

public sealed class CostosRepository(
    IOracleConnectionFactory connectionFactory,
    IValidacionesRepository validacionesRepository,
    ISuministrosRepository suministrosRepository) : ICostosRepository
{
    public async Task<ValidapreactualizaResponse> ValidapreactualizaAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
    {
        _ = usuario;
        const string sql = "BEGIN :res := PK_VALIDACIONES.fauco_antesliquidar(:1,:2,:3); END;";
        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.Decimal, direction: ParameterDirection.Output);
        parameters.Add("1", aps);
        parameters.Add("2", mes);
        parameters.Add("3", anno);

        using var connection = await OpenConnectionAsync(cancellationToken);

        try
        {
            await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));

            const string detalleSql = @"SELECT EMPR_NOMBRE AS EmpresaNombre,
       TRIM(VALI_GRUPO) AS Grupo,
       TRIM(VALI_VAR) AS Variable,
       ROUND(VALI_VALOR, 6) AS Valor,
       EMPR_PROPIA AS EmpresaPropia
FROM VAUCO_ANTESLIQUIDAR
WHERE APSA_ID = :aps AND VALI_ANNO = :anno AND VALI_MES = :mes
ORDER BY EMPR_NOMBRE, VALI_GRUPO, VALI_VAR";

            var detalle = await connection.QueryAsync<VerificacionDetalleResponse>(
                new CommandDefinition(detalleSql, new { aps, anno, mes }, cancellationToken: cancellationToken));

            return new ValidapreactualizaResponse(true, detalle.ToList());
        }
        catch (OracleException ex) when (ex.Number == 3135)
        {
            throw new OracleTimeoutException("Se perdió la conexión con Oracle durante la validación previa.");
        }
    }

    public async Task<RunPrechecksResponse> RunPrechecksAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
    {
        _ = usuario;

        try
        {
            var prechecks = await RunPrechecksInternalAsync(aps, mes, anno, cancellationToken);
            var allPassed = prechecks.All(p => string.Equals(p.Estado, "success", StringComparison.OrdinalIgnoreCase));
            return new RunPrechecksResponse(allPassed, prechecks);
        }
        catch (OracleException ex) when (ex.Number == 3135)
        {
            throw new OracleTimeoutException("Se perdió la conexión con Oracle durante la ejecución de prechecks.");
        }
    }

    public async Task<CalculartarifasResponse> CalculartarifasAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
    {
        const string sql = "BEGIN :res := PK_LIQUIDAR.fauco_calculartarifas(:1,:2,:3,:4); END;";
        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.Int32, direction: ParameterDirection.Output);
        parameters.Add("1", aps);
        parameters.Add("2", mes);
        parameters.Add("3", anno);
        parameters.Add("4", usuario);

        using var connection = await OpenConnectionAsync(cancellationToken);

        try
        {
            await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));

            var returnCode = parameters.Get<int?>("res") ?? 1;
            var resultado = returnCode == 0
                ? "Cálculo ejecutado correctamente."
                : "El cálculo retornó error en Oracle.";

            return new CalculartarifasResponse(returnCode == 0, resultado);
        }
        catch (OracleException ex) when (ex.Number == 3135)
        {
            throw new OracleTimeoutException("Se perdió la conexión con Oracle durante el cálculo de tarifas.");
        }
    }

    public async Task<CertificarTarifasResponse> CertificarTarifasAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();

        try
        {
            var existeCertificacion = await connection.ExecuteScalarAsync<int>(new CommandDefinition(@"SELECT COUNT(1)
FROM AUCO_TARICERTIFICADA
WHERE APSA_ID = :aps AND TACE_ANNO = :anno AND TACE_MES = :mes", new { aps, anno, mes }, transaction: transaction, cancellationToken: cancellationToken));
            if (existeCertificacion > 0)
            {
                throw new ConflictException("El período ya se encuentra certificado.");
            }

            var existeCalculo = await connection.ExecuteScalarAsync<int>(new CommandDefinition(@"SELECT COUNT(1)
FROM VAUCO_COSTOS
WHERE APSCOSTO = :aps AND ANNOCOSTO = :anno AND MESCOSTO = :mes", new { aps, anno, mes }, transaction: transaction, cancellationToken: cancellationToken));

            if (existeCalculo <= 0)
            {
                throw new InvalidOperationException("No existe cálculo previo para certificar el período seleccionado.");
            }

            const string insertSql = @"INSERT INTO AUCO_TARICERTIFICADA (APSA_ID, TACE_ANNO, TACE_MES, TACE_FECCREA, USUA_USUARIO)
VALUES (:aps, :anno, :mes, SYSDATE, :usuario)";

            await connection.ExecuteAsync(new CommandDefinition(insertSql, new { aps, mes, anno, usuario }, transaction: transaction, cancellationToken: cancellationToken));

            transaction.Commit();
            return new CertificarTarifasResponse(true, DateTime.UtcNow);
        }
        catch (OracleException ex) when (ex.Number == 1)
        {
            transaction.Rollback();
            throw new ConflictException("El período ya se encuentra certificado.");
        }
        catch (OracleException ex) when (ex.Number == 3135)
        {
            transaction.Rollback();
            throw new OracleTimeoutException("Se perdió la conexión con Oracle durante la certificación.");
        }
        catch
        {
            transaction.Rollback();
            throw;
        }
    }

    private async Task<IReadOnlyList<PrecheckResultResponse>> RunPrechecksInternalAsync(int aps, int mes, int anno, CancellationToken cancellationToken)
    {
        var checks = new (string Nombre, Func<Task<string?>> Execute)[]
        {
            ("certificarFauco_cpsuivsfact", () => validacionesRepository.ExecuteAsync("fauco_cpsuivsfact", aps, anno, mes, cancellationToken)),
            ("certificarFauco_cpproductividad", () => validacionesRepository.ExecuteAsync("fauco_cpproductividad", aps, anno, mes, cancellationToken)),
            ("certificarFauco_cpenero", () => validacionesRepository.ExecuteAsync("fauco_cpenero", aps, anno, mes, cancellationToken)),
            ("cenrtificarEditar", () => suministrosRepository.CenrtificarEditarAsync(new Contracts.Requests.CertificarRequest(aps, anno, mes), cancellationToken))
        };

        var results = new List<PrecheckResultResponse>();
        var blocked = false;

        foreach (var check in checks)
        {
            if (blocked)
            {
                results.Add(new PrecheckResultResponse(check.Nombre, "pending", "No ejecutado por fallo previo."));
                continue;
            }

            var raw = await check.Execute();
            if (IsSuccessfulCheck(raw))
            {
                results.Add(new PrecheckResultResponse(check.Nombre, "success", "OK"));
                continue;
            }

            var detalle = string.IsNullOrWhiteSpace(raw) ? "Falló sin detalle." : raw.Trim();
            results.Add(new PrecheckResultResponse(check.Nombre, "error", detalle));
            blocked = true;
        }

        return results;
    }

    private static bool IsSuccessfulCheck(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw))
        {
            return true;
        }

        var normalized = raw.Trim();
        return normalized is "0" or "1" or "OK";
    }

    private async Task<IDbConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        var connection = connectionFactory.CreateConnection();
        if (connection is null)
        {
            throw new InvalidOperationException("No fue posible crear conexión Oracle.");
        }

        if (connection is not null && connection.State != ConnectionState.Open)
        {
            if (connection is System.Data.Common.DbConnection dbConnection)
            {
                await dbConnection.OpenAsync(cancellationToken);
            }
            else
            {
                connection.Open();
            }
        }

        return connection!;
    }

    // ──────────────────────────────────────────────────────────────
    // Endpoints de soporte
    // ──────────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<CostoItemResponse>> ConsultarCostosAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT APSCOSTO AS ApsCosto, EMPRESACOSTO AS EmpresaCosto, CODCOSTO AS CodCosto,
                   NOMCOSTO AS NomCosto, ANNOCOSTO AS AnnoCosto, MESCOSTO AS MesCosto,
                   ROUND(ACOBRAR, 6) AS ACobrar, ROUND(VALOR, 6) AS VALOR, ROUND(VARIACION, 6) AS VARIACION
            FROM VAUCO_COSTOS
            WHERE APSCOSTO = :aps AND ANNOCOSTO = :anno AND MESCOSTO = :mes
            ORDER BY CODCOSTO";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<CostoItemResponse>(
            new CommandDefinition(sql, new { aps, anno, mes }, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<CostoClusItemResponse>> ConsultarCostosClusAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT APSA_ID AS ApsaId, COST_ANNO AS CostAnno, COST_MES AS CostMes,
                   PARA_COSTO20021 AS ParaCosto20021, PARA_NOMBRE AS ParaNombre, ROUND(COST_VALOR, 6) AS CostValor
            FROM VACUO_COSTOSCLUS
            WHERE APSA_ID = :aps AND COST_ANNO = :anno AND COST_MES = :mes
            ORDER BY PARA_COSTO20021";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<CostoClusItemResponse>(
            new CommandDefinition(sql, new { aps, anno, mes }, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<ComportaClusItemResponse>> ConsultarComportaClusAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT APSA_ID AS ApsaId, INED_ANNO AS InedAnno, INED_MES AS InedMes,
                   ROUND(INED_CP, 6) AS InedCp, ROUND(INED_M2CCJ, 6) AS InedM2ccj, ROUND(INED_M2LAVJ, 6) AS InedM2lavj,
                   ROUND(INED_TIJ, 6) AS InedTij, ROUND(INED_KLPJ, 6) AS InedKlpj, ROUND(INED_TMJ, 6) AS InedTmj
            FROM VAUCO_ACTICLUS
            WHERE APSA_ID = :aps
              AND INED_ANNO * 12 + INED_MES BETWEEN (:anno * 12 + :mes) - 6 AND :anno * 12 + :mes
            ORDER BY INED_ANNO, INED_MES";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<ComportaClusItemResponse>(
            new CommandDefinition(sql, new { aps, anno, mes }, cancellationToken: cancellationToken));
        return rows.ToList();
    }
}
