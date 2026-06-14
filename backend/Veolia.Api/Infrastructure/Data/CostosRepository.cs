using Dapper;
using Oracle.ManagedDataAccess.Client;
using System.Data;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Infrastructure.Data;

public sealed class CostosRepository(
    IOracleConnectionFactory connectionFactory,
    IValidacionesRepository validacionesRepository,
    ISuministrosRepository suministrosRepository) : ICostosRepository
{
    public async Task<ValidapreactualizaResponse> ValidapreactualizaAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
    {
        const string sql = "BEGIN :res := PK_VALGRAL.fauco_antesliquidar(:1,:2,:3,:4); END;";
        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.String, direction: ParameterDirection.Output, size: 4000);
        parameters.Add("1", aps);
        parameters.Add("2", anno);
        parameters.Add("3", mes);
        parameters.Add("4", usuario);

        using var connection = await OpenConnectionAsync(cancellationToken);

        long? auditId = null;
        try
        {
            auditId = await InsertAuditAsync(connection, aps, mes, anno, "INICIADO", "Validación previa iniciada.", cancellationToken);
            await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));

            var mensajeOracle = parameters.Get<string>("res") ?? string.Empty;
            var mensajes = string.IsNullOrWhiteSpace(mensajeOracle)
                ? new List<string>()
                : mensajeOracle.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

            var antesLiquidarEstado = await connection.QueryFirstOrDefaultAsync<string>(
                new CommandDefinition(@"SELECT NVL(AL_ESTADO, 'PENDIENTE')
FROM VAUCO_ANTESLIQUIDAR
WHERE APS_ID = :aps AND ANNO = :anno AND MES = :mes
ORDER BY AL_FECHA DESC
FETCH FIRST 1 ROWS ONLY", new { aps, anno, mes }, cancellationToken: cancellationToken)) ?? "PENDIENTE";

            var bloqueante = mensajes.Any(IsBlockingMessage);
            var estadoFinal = bloqueante ? "BLOQUEADO" : "VERIFICADO";
            await UpdateAuditAsync(connection, auditId, estadoFinal, bloqueante
                ? string.Join(" | ", mensajes.DefaultIfEmpty("Validación bloqueante"))
                : "Validación previa exitosa. Listo para ejecutar prechecks.", cancellationToken);

            return new ValidapreactualizaResponse(!bloqueante, mensajes, estadoFinal);
        }
        catch (OracleException ex) when (ex.Number == 3135)
        {
            await UpdateAuditSafeAsync(connection, auditId, "ERROR", "Se perdió la conexión con Oracle durante la validación previa.", cancellationToken);
            throw new OracleTimeoutException("Se perdió la conexión con Oracle durante la validación previa.");
        }
        catch
        {
            await UpdateAuditSafeAsync(connection, auditId, "ERROR", "Error no controlado en validación previa.", cancellationToken);
            throw;
        }
    }

    public async Task<RunPrechecksResponse> RunPrechecksAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
    {
        _ = usuario;
        using var connection = await OpenConnectionAsync(cancellationToken);

        var estado = await connection.QueryFirstOrDefaultAsync<string>(new CommandDefinition(@"SELECT NVL(AL_ESTADO, 'PENDIENTE')
FROM VAUCO_ANTESLIQUIDAR
WHERE APS_ID = :aps AND ANNO = :anno AND MES = :mes
ORDER BY AL_FECHA DESC
FETCH FIRST 1 ROWS ONLY", new { aps, anno, mes }, cancellationToken: cancellationToken)) ?? "PENDIENTE";

        if (!string.Equals(estado, "VERIFICADO", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(estado, "LISTO_CALCULAR", StringComparison.OrdinalIgnoreCase))
        {
            throw new PreconditionFailedException("Debe ejecutar la validación previa antes de correr prechecks.");
        }

        long? auditId = null;
        try
        {
            auditId = await InsertAuditAsync(connection, aps, mes, anno, "INICIADO", "Prechecks iniciados.", cancellationToken);
            var prechecks = await RunPrechecksInternalAsync(aps, mes, anno, cancellationToken);
            var allPassed = prechecks.All(p => string.Equals(p.Estado, "success", StringComparison.OrdinalIgnoreCase));

            await UpdateAuditAsync(
                connection,
                auditId,
                allPassed ? "LISTO_CALCULAR" : "BLOQUEADO",
                string.Join(" | ", prechecks.Select(p => $"{p.Nombre}: {p.Mensaje}")),
                cancellationToken);

            return new RunPrechecksResponse(allPassed, prechecks);
        }
        catch (OracleException ex) when (ex.Number == 3135)
        {
            await UpdateAuditSafeAsync(connection, auditId, "ERROR", "Se perdió la conexión con Oracle durante la ejecución de prechecks.", cancellationToken);
            throw new OracleTimeoutException("Se perdió la conexión con Oracle durante la ejecución de prechecks.");
        }
        catch
        {
            await UpdateAuditSafeAsync(connection, auditId, "ERROR", "Error no controlado durante la ejecución de prechecks.", cancellationToken);
            throw;
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
        long? auditId = null;

        try
        {
            await EnsurePrecheckEstadoValidoAsync(connection, aps, mes, anno, cancellationToken);
            auditId = await InsertAuditAsync(connection, aps, mes, anno, "INICIADO", "Cálculo de tarifas iniciado.", cancellationToken);
            await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));

            var returnCode = parameters.Get<int?>("res") ?? 1;
            var pasos = BuildPasos(aps, returnCode == 0);
            var resultado = returnCode == 0
                ? (aps == 1031
                    ? "Cálculo ejecutado correctamente. Advertencia: APS=1031 omitió el paso 5."
                    : "Cálculo ejecutado correctamente.")
                : "El cálculo retornó error en Oracle.";

            await UpdateAuditAsync(connection, auditId, returnCode == 0 ? "COMPLETADO" : "ERROR", resultado, cancellationToken);
            return new CalculartarifasResponse(returnCode == 0, pasos, resultado);
        }
        catch (OracleException ex) when (ex.Number == 3135)
        {
            await UpdateAuditSafeAsync(connection, auditId, "ERROR", "Se perdió la conexión con Oracle durante el cálculo de tarifas.", cancellationToken);
            throw new OracleTimeoutException("Se perdió la conexión con Oracle durante el cálculo de tarifas.");
        }
        catch
        {
            await UpdateAuditSafeAsync(connection, auditId, "ERROR", "Error no controlado durante cálculo de tarifas.", cancellationToken);
            throw;
        }
    }

    public async Task<CertificarTarifasResponse> CertificarTarifasAsync(int aps, int mes, int anno, int usuario, CancellationToken cancellationToken)
    {
        using var connection = await OpenConnectionAsync(cancellationToken);
        using var transaction = connection.BeginTransaction();
        long? auditId = null;

        try
        {
            await EnsurePrecheckEstadoValidoAsync(connection, aps, mes, anno, cancellationToken, transaction);
            auditId = await InsertAuditAsync(connection, aps, mes, anno, "INICIADO", "Certificación iniciada.", cancellationToken, transaction);

            var existeCertificacion = await connection.ExecuteScalarAsync<int>(new CommandDefinition(@"SELECT COUNT(1)
FROM AUCO_TARICERTIFICADA
WHERE APS_ID = :aps AND ANNO = :anno AND MES = :mes", new { aps, anno, mes }, transaction: transaction, cancellationToken: cancellationToken));
            if (existeCertificacion > 0)
            {
                throw new ConflictException("El período ya se encuentra certificado.");
            }

            var existeCalculo = await connection.ExecuteScalarAsync<int>(new CommandDefinition(@"SELECT COUNT(1)
FROM VAUCO_COSTOS
WHERE APS_ID = :aps AND ANNO = :anno AND MES = :mes", new { aps, anno, mes }, transaction: transaction, cancellationToken: cancellationToken));

            if (existeCalculo <= 0)
            {
                throw new InvalidOperationException("No existe cálculo previo para certificar el período seleccionado.");
            }

            const string insertSql = @"INSERT INTO AUCO_TARICERTIFICADA (TC_ID, APS_ID, MES, ANNO, TC_FECHA, USUA_USUA, TC_ESTADO)
VALUES (SAUCO_TARICERTIFICADA.NEXTVAL, :aps, :mes, :anno, SYSDATE, :usuario, 'CERTIFICADO')";

            await connection.ExecuteAsync(new CommandDefinition(insertSql, new { aps, mes, anno, usuario }, transaction: transaction, cancellationToken: cancellationToken));

            await UpdateAuditAsync(connection, auditId, "COMPLETADO", "Tarifas certificadas correctamente.", cancellationToken, transaction);

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

    private async Task EnsurePrecheckEstadoValidoAsync(IDbConnection connection, int aps, int mes, int anno, CancellationToken cancellationToken, IDbTransaction? transaction = null)
    {
        var estado = await connection.QueryFirstOrDefaultAsync<string>(new CommandDefinition(@"SELECT NVL(AL_ESTADO, 'PENDIENTE')
FROM VAUCO_ANTESLIQUIDAR
WHERE APS_ID = :aps AND ANNO = :anno AND MES = :mes
ORDER BY AL_FECHA DESC
FETCH FIRST 1 ROWS ONLY", new { aps, anno, mes }, transaction: transaction, cancellationToken: cancellationToken));

        if (!string.Equals(estado, "LISTO_CALCULAR", StringComparison.OrdinalIgnoreCase))
        {
            throw new PreconditionFailedException("Debe ejecutar la validación previa y prechecks antes de calcular o certificar.");
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

    private static bool IsBlockingMessage(string message)
        => message.Contains("ERROR", StringComparison.OrdinalIgnoreCase)
           || message.Contains("BLOQ", StringComparison.OrdinalIgnoreCase)
           || message.Contains("NO ", StringComparison.OrdinalIgnoreCase)
           || message.Contains("FALL", StringComparison.OrdinalIgnoreCase);

    private async Task<long> InsertAuditAsync(IDbConnection connection, int aps, int mes, int anno, string estado, string mensaje, CancellationToken cancellationToken, IDbTransaction? transaction = null)
    {
        const string sql = @"INSERT INTO VAUCO_ANTESLIQUIDAR (AL_ID, APS_ID, MES, ANNO, AL_ESTADO, AL_MENSAJE, AL_FECHA)
VALUES (SVAUCO_ANTESLIQUIDAR.NEXTVAL, :aps, :mes, :anno, :estado, :mensaje, SYSDATE)
RETURNING AL_ID INTO :id";

        var parameters = new DynamicParameters();
        parameters.Add("aps", aps);
        parameters.Add("mes", mes);
        parameters.Add("anno", anno);
        parameters.Add("estado", estado);
        parameters.Add("mensaje", mensaje);
        parameters.Add("id", dbType: DbType.Int64, direction: ParameterDirection.Output);

        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, transaction: transaction, cancellationToken: cancellationToken));
        return parameters.Get<long>("id");
    }

    private async Task UpdateAuditAsync(IDbConnection connection, long? auditId, string estado, string mensaje, CancellationToken cancellationToken, IDbTransaction? transaction = null)
    {
        if (!auditId.HasValue)
        {
            return;
        }

        const string sql = @"UPDATE VAUCO_ANTESLIQUIDAR
SET AL_ESTADO = :estado,
    AL_MENSAJE = :mensaje,
    AL_FECHA = SYSDATE
WHERE AL_ID = :id";

        await connection.ExecuteAsync(new CommandDefinition(sql, new { estado, mensaje, id = auditId.Value }, transaction: transaction, cancellationToken: cancellationToken));
    }

    private async Task UpdateAuditSafeAsync(IDbConnection connection, long? auditId, string estado, string mensaje, CancellationToken cancellationToken)
    {
        try
        {
            await UpdateAuditAsync(connection, auditId, estado, mensaje, cancellationToken);
        }
        catch
        {
            // no-op: no enmascarar error original
        }
    }

    private static IReadOnlyList<PasoEjecucionResponse> BuildPasos(int aps, bool exitoso)
    {
        var estados = exitoso ? "completado" : "error";
        var pasos = new List<PasoEjecucionResponse>
        {
            new("Paso 1: Inicializar", estados, exitoso ? "OK" : "Falló la ejecución"),
            new("Paso 2: Limpiar", estados, exitoso ? "OK" : "Falló la ejecución"),
            new("Paso 3: Calcular base", estados, exitoso ? "OK" : "Falló la ejecución"),
            new("Paso 4: Aplicar ajustes", estados, exitoso ? "OK" : "Falló la ejecución")
        };

        if (aps == 1031)
        {
            pasos.Add(new PasoEjecucionResponse("Paso 5: Generar resumen", "omitido", "Omitido por regla APS=1031."));
        }
        else
        {
            pasos.Add(new PasoEjecucionResponse("Paso 5: Generar resumen", estados, exitoso ? "OK" : "Falló la ejecución"));
        }

        pasos.Add(new PasoEjecucionResponse("Paso 6: Finalizar", estados, exitoso ? "OK" : "Falló la ejecución"));
        return pasos;
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
            SELECT APS_ID AS ApsId, MES, ANNO, COST_VALOR AS CostValor, COST_TIPO AS CostTipo, COST_FECHA AS CostFecha
            FROM VAUCO_COSTOS
            WHERE APS_ID = :aps AND ANNO = :anno AND MES = :mes
            ORDER BY COST_TIPO";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<CostoItemResponse>(
            new CommandDefinition(sql, new { aps, anno, mes }, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<CostoClusItemResponse>> ConsultarCostosClusAsync(int aps, int anno, int mes, CancellationToken cancellationToken)
    {
        const string sql = @"
            SELECT APSA_ID AS ApsaId, COST_ANNO AS CostAnno, COST_MES AS CostMes,
                   PARA_COSTO20021 AS ParaCosto20021, PARA_NOMBRE AS ParaNombre, COST_VALOR AS CostValor
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
                   INED_CP AS InedCp, INED_M2CCJ AS InedM2ccj, INED_M2LAVJ AS InedM2lavj,
                   INED_TIJ AS InedTij, INED_KLPJ AS InedKlpj, INED_TMJ AS InedTmj
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
