using Dapper;
using Microsoft.AspNetCore.Http;
using System.Data;
using Veolia.Api.Contracts.Requests;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Infrastructure.Data.Interfaces;

namespace Veolia.Api.Infrastructure.Data;

public sealed class CertificacionRepository(IOracleConnectionFactory connectionFactory) : ICertificacionRepository
{
    public async Task<IReadOnlyList<CatalogoItemResponse>> GetPeriodosAsync(int? vigencia, CancellationToken cancellationToken)
    {
        const string sql = "SELECT DISTINCT TARI_ANNO AS \"Id\", TO_CHAR(TARI_ANNO) AS \"Nombre\" FROM AUCO_TARIFAS WHERE (:vigencia IS NULL OR TARI_ANNO = :vigencia) ORDER BY 1 DESC";
        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<CatalogoItemResponse>(new CommandDefinition(sql, new { vigencia }, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<CatalogoItemResponse>> GetMunicipiosAsync(int departamentoId, CancellationToken cancellationToken)
    {
        const string sql = "SELECT MUNI_ID AS \"Id\", MUNI_NOMBRE AS \"Nombre\" FROM AUCO_MUNICIPIOS WHERE DEPA_ID = :departamentoId ORDER BY MUNI_NOMBRE";
        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<CatalogoItemResponse>(new CommandDefinition(sql, new { departamentoId }, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<CatalogoItemResponse>> GetPrestadoresAsync(int municipioId, string? filtro, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT PRES_ID AS ""Id"", PRES_NOMBRE AS ""Nombre""
FROM AUCO_PRESTADORES
WHERE MUNI_ID = :municipioId
  AND (:filtro IS NULL OR UPPER(PRES_NOMBRE) LIKE '%' || UPPER(:filtro) || '%')
ORDER BY PRES_NOMBRE";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<CatalogoItemResponse>(new CommandDefinition(sql, new { municipioId, filtro }, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<CatalogoItemResponse>> GetTiposCargueAsync(CancellationToken cancellationToken)
    {
        const string sql = "SELECT TICA_ID AS \"Id\", TICA_NOMBRE AS \"Nombre\" FROM AUCO_TIPOCARGUE ORDER BY TICA_NOMBRE";
        using var connection = await OpenConnectionAsync(cancellationToken);
        var rows = await connection.QueryAsync<CatalogoItemResponse>(new CommandDefinition(sql, cancellationToken: cancellationToken));
        return rows.ToList();
    }

    public async Task<CrearCargueResponse> CrearCargueAsync(CrearCargueRequest request, CancellationToken cancellationToken)
    {
        const string sql = "BEGIN :res := PK_CERTIFICACION.CREAR_CARGUE(:1,:2,:3,:4,:5); END;";
        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.Int64, direction: ParameterDirection.Output);
        parameters.Add("1", request.PeriodoId);
        parameters.Add("2", request.MunicipioId);
        parameters.Add("3", request.PrestadorId);
        parameters.Add("4", request.TipoCargueId);
        parameters.Add("5", request.Usuario);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        var cargueId = parameters.Get<long?>("res") ?? 0;
        return new CrearCargueResponse(cargueId, "CREADO");
    }

    public async Task<SubirArchivoResponse> SubirArchivoAsync(long cargueId, IFormFile file, CancellationToken cancellationToken)
    {
        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        var permitidas = new[] { ".csv", ".xlsx", ".xls" };
        if (!permitidas.Contains(extension))
        {
            throw new InvalidOperationException("El tipo de archivo no es válido.");
        }

        if (file.Length > 25 * 1024 * 1024)
        {
            throw new InvalidOperationException("El archivo supera el máximo permitido de 25MB.");
        }

        var tempPath = Path.Combine(Path.GetTempPath(), $"certificacion_{cargueId}_{Guid.NewGuid():N}{extension}");
        await using (var fs = File.Create(tempPath))
        {
            await file.CopyToAsync(fs, cancellationToken);
        }

        var filasLeidas = 0;
        if (extension == ".csv")
        {
            filasLeidas = File.ReadLines(tempPath).Count();
        }

        const string sql = "BEGIN :res := PK_CERTIFICACION.REGISTRAR_ARCHIVO(:1,:2,:3); END;";
        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.Int64, direction: ParameterDirection.Output);
        parameters.Add("1", cargueId);
        parameters.Add("2", file.FileName);
        parameters.Add("3", tempPath);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        var archivoId = parameters.Get<long?>("res") ?? 0;

        return new SubirArchivoResponse(archivoId, filasLeidas, 0, []);
    }

    public async Task<ParsearArchivoResponse> ParsearArchivoAsync(long cargueId, ParsearArchivoRequest request, CancellationToken cancellationToken)
    {
        const string sql = "BEGIN :res := PK_CERTIFICACION.PARSEAR_ARCHIVO(:1,:2,:3); END;";
        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.Int32, direction: ParameterDirection.Output);
        parameters.Add("1", cargueId);
        parameters.Add("2", request.Separador);
        parameters.Add("3", request.Hoja);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        var filasTotales = parameters.Get<int?>("res") ?? 0;

        return new ParsearArchivoResponse(filasTotales, filasTotales, 0, []);
    }

    public async Task<ResumenCargueResponse> GetResumenCargueAsync(long cargueId, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT CARG_ID AS ""CargueId"", CARG_ESTADO AS ""Estado"", CARG_FILAS_TOTAL AS ""FilasTotales"", CARG_FILAS_VALIDAS AS ""FilasValidas"", CARG_FILAS_INVALIDAS AS ""FilasInvalidas""
FROM CERT_CARGUE
WHERE CARG_ID = :cargueId";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var data = await connection.QueryFirstOrDefaultAsync<ResumenCargueResponse>(new CommandDefinition(sql, new { cargueId }, cancellationToken: cancellationToken));
        return data ?? new ResumenCargueResponse(cargueId, "NO_ENCONTRADO", 0, 0, 0);
    }

    public async Task<ErroresCargueResponse> GetErroresCargueAsync(long cargueId, int page, int size, CancellationToken cancellationToken)
    {
        var offset = (page - 1) * size;
        const string sql = @"SELECT CACE_FILA AS ""Fila"", CACE_CAMPO AS ""Campo"", CACE_ERROR AS ""Mensaje""
FROM CERT_CARGUE_ERROR
WHERE CARG_ID = :cargueId
ORDER BY CACE_FILA
OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY";
        const string countSql = "SELECT COUNT(1) FROM CERT_CARGUE_ERROR WHERE CARG_ID = :cargueId";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var items = (await connection.QueryAsync<ErrorCargueItemResponse>(new CommandDefinition(sql, new { cargueId, offset, size }, cancellationToken: cancellationToken))).ToList();
        var total = await connection.ExecuteScalarAsync<int>(new CommandDefinition(countSql, new { cargueId }, cancellationToken: cancellationToken));
        return new ErroresCargueResponse(items, total, page, size);
    }

    public async Task<ConfirmarCargueResponse> ConfirmarCargueAsync(long cargueId, ConfirmarCargueRequest request, CancellationToken cancellationToken)
    {
        const string sql = "BEGIN :res := PK_CERTIFICACION.CONFIRMAR_CARGUE(:1,:2); END;";
        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.Int32, direction: ParameterDirection.Output);
        parameters.Add("1", cargueId);
        parameters.Add("2", request.Usuario);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        var ok = (parameters.Get<int?>("res") ?? 0) == 1;
        return new ConfirmarCargueResponse(ok, DateTime.UtcNow);
    }

    public async Task<EjecutarValidacionResponse> EjecutarValidacionAsync(EjecutarValidacionRequest request, CancellationToken cancellationToken)
    {
        const string sql = "BEGIN :res := PK_CERTIFICACION.EJECUTAR_VALIDACIONES(:1,:2); END;";
        var reglasCsv = request.Reglas is { Count: > 0 } ? string.Join(',', request.Reglas) : null;
        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.Int64, direction: ParameterDirection.Output);
        parameters.Add("1", request.CargueId);
        parameters.Add("2", reglasCsv);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        var validacionId = parameters.Get<long?>("res") ?? 0;
        return new EjecutarValidacionResponse(validacionId, "EN_PROCESO", "Validaciones en ejecución");
    }

    public async Task<EstadoValidacionResponse> GetValidacionAsync(long validacionId, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT VALI_ID AS ""ValidacionId"", VALI_ESTADO AS ""Estado"", NVL(VALI_TOTALES,0) AS ""Totales""
FROM CERT_VALIDACION WHERE VALI_ID = :validacionId";
        using var connection = await OpenConnectionAsync(cancellationToken);
        var baseData = await connection.QueryFirstOrDefaultAsync<(long ValidacionId, string Estado, int Totales)>(new CommandDefinition(sql, new { validacionId }, cancellationToken: cancellationToken));
        if (baseData == default)
        {
            return new EstadoValidacionResponse(validacionId, "NO_ENCONTRADO", 0, []);
        }

        return new EstadoValidacionResponse(baseData.ValidacionId, baseData.Estado, baseData.Totales, []);
    }

    public async Task<EjecutarCertificacionResponse> EjecutarCertificacionAsync(EjecutarCertificacionRequest request, CancellationToken cancellationToken)
    {
        const string sql = "BEGIN :res := PK_CERTIFICACION.EJECUTAR_CERTIFICACION(:1,:2,:3); END;";
        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.Int64, direction: ParameterDirection.Output);
        parameters.Add("1", request.CargueId);
        parameters.Add("2", request.Usuario);
        parameters.Add("3", request.Forzar ? 1 : 0);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        var ejecucionId = parameters.Get<long?>("res") ?? 0;
        return new EjecutarCertificacionResponse(ejecucionId, "EN_PROCESO");
    }

    public async Task<EstadoEjecucionResponse> GetEjecucionAsync(long ejecucionId, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT EJEC_ID AS ""EjecucionId"", EJEC_ESTADO AS ""Estado"", NVL(EJEC_PROGRESO,0) AS ""Progreso"", NVL(EJEC_RESULTADO,'') AS ""Resultado""
FROM CERT_EJECUCION WHERE EJEC_ID = :ejecucionId";
        using var connection = await OpenConnectionAsync(cancellationToken);
        var data = await connection.QueryFirstOrDefaultAsync<EstadoEjecucionResponse>(new CommandDefinition(sql, new { ejecucionId }, cancellationToken: cancellationToken));
        return data ?? new EstadoEjecucionResponse(ejecucionId, "NO_ENCONTRADO", 0, string.Empty);
    }

    public async Task<ResultadosCertificacionResponse> GetResultadosAsync(long cargueId, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT REGLA AS ""Regla"", ESTADO AS ""Estado"", DETALLE AS ""Detalle""
FROM CERT_RESULTADO WHERE CARG_ID = :cargueId";
        using var connection = await OpenConnectionAsync(cancellationToken);
        var items = (await connection.QueryAsync<ResultadoCertificacionItemResponse>(new CommandDefinition(sql, new { cargueId }, cancellationToken: cancellationToken))).ToList();
        return new ResultadosCertificacionResponse(items, items.Count);
    }

    public async Task<RevertirCargueResponse> RevertirCargueAsync(long cargueId, RevertirCargueRequest request, CancellationToken cancellationToken)
    {
        const string sql = "BEGIN :res := PK_CERTIFICACION.REVERTIR_CARGUE(:1,:2,:3); END;";
        var parameters = new DynamicParameters();
        parameters.Add("res", dbType: DbType.Int32, direction: ParameterDirection.Output);
        parameters.Add("1", cargueId);
        parameters.Add("2", request.Motivo);
        parameters.Add("3", request.Usuario);

        using var connection = await OpenConnectionAsync(cancellationToken);
        await connection.ExecuteAsync(new CommandDefinition(sql, parameters, cancellationToken: cancellationToken));
        var ok = (parameters.Get<int?>("res") ?? 0) == 1;
        return new RevertirCargueResponse(ok);
    }

    public async Task<PlantillaResponse> GetPlantillaAsync(int tipoCargueId, CancellationToken cancellationToken)
    {
        const string sql = @"SELECT ARCHIVO_NOMBRE AS ""FileName"", CONTENT_TYPE AS ""ContentType"", CONTENIDO_BASE64 AS ""Base64""
FROM CERT_PLANTILLA WHERE TIPO_CARGUE_ID = :tipoCargueId";

        using var connection = await OpenConnectionAsync(cancellationToken);
        var data = await connection.QueryFirstOrDefaultAsync<PlantillaResponse>(new CommandDefinition(sql, new { tipoCargueId }, cancellationToken: cancellationToken));
        return data ?? new PlantillaResponse("plantilla.csv", "text/csv", string.Empty);
    }

    private async Task<IDbConnection> OpenConnectionAsync(CancellationToken cancellationToken)
    {
        var connection = connectionFactory.CreateConnection();
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

        return connection;
    }
}
