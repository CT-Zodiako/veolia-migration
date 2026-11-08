using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using System.Reflection;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Diagnostics;
using Oracle.ManagedDataAccess.Client;
using Veolia.Api.Contracts.Responses;
using Veolia.Api.Exceptions;
using Veolia.Api.Infrastructure.Auth;

namespace Veolia.Api.Infrastructure.Errors;

// Every exception a controller lets escape ends here: it is logged once with the context support
// needs (traceId, user, endpoint, redacted body, throwing method, Oracle operation) and answered
// with the usual envelope, so controllers no longer repeat 500/502 catch blocks.
public sealed partial class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public const string GenericMessage = "Ocurrió un error procesando la solicitud.";

    private const int OracleConnectionLost = 3135;

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (httpContext.Response.HasStarted)
        {
            return false;
        }

        var request = httpContext.Request;
        var traceId = httpContext.TraceIdentifier;
        var endpoint = $"{request.Method} {request.Path}";
        var usuario = AuthTokenContextAccessor.TryRead(request.Headers["x-access-token"].FirstOrDefault(), out var token)
            ? token.SisuId.ToString()
            : "-";
        var metodo = ThrowingMethod(exception) ?? "-";
        var body = await RequestBodyCapture.ReadRedactedAsync(request);

        var (status, message, oraCode, detail) = Describe(exception, metodo);

        if (status >= StatusCodes.Status500InternalServerError)
        {
            LogFailure(exception, metodo, usuario, endpoint, traceId, body);
        }
        else
        {
            logger.LogWarning(exception,
                "Solicitud rechazada {Status} \"{Mensaje}\" metodo={Metodo} usuario={Usuario} endpoint={Endpoint} traceId={TraceId} body={Body}",
                status, message, metodo, usuario, endpoint, traceId, body);
        }

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(
            new ApiEnvelopeResponse<object>("error", new { }, message, traceId, oraCode, detail),
            cancellationToken);
        return true;
    }

    private static (int Status, string Message, string? OraCode, ApiErrorDetail? Detail) Describe(Exception exception, string metodo)
    {
        switch (exception)
        {
            case OracleTimeoutException timeout:
                return (StatusCodes.Status502BadGateway, timeout.Message, "ORA-03135",
                    new ApiErrorDetail(metodo, "ORA-03135", null, timeout.Message));
            case ConflictException:
                return (StatusCodes.Status409Conflict, exception.Message, null, null);
            case NotFoundException:
                return (StatusCodes.Status404NotFound, exception.Message, null, null);
            case PreconditionFailedException:
                return (StatusCodes.Status412PreconditionFailed, exception.Message, null, null);
            case ValidationException:
                return (StatusCodes.Status400BadRequest, exception.Message, null, null);
        }

        if (AsOracleOperation(exception, metodo) is { } oracle)
        {
            var status = Math.Abs(oracle.OraNumber) == OracleConnectionLost
                ? StatusCodes.Status502BadGateway
                : StatusCodes.Status500InternalServerError;
            return (status, OracleErrorMessages.For(oracle.OraNumber, oracle.OracleMessage, oracle.Constraint), oracle.OraCode,
                new ApiErrorDetail(oracle.Operation, oracle.OraCode, oracle.Constraint, oracle.OracleMessage));
        }

        return (StatusCodes.Status500InternalServerError, GenericMessage, null, null);
    }

    // A raw OracleException (a repository not yet wrapped with OracleOperation.RunAsync) is
    // described like a wrapped one; the operation is the Modules method that threw.
    private static OracleOperationException? AsOracleOperation(Exception exception, string metodo) => exception switch
    {
        OracleOperationException wrapped => wrapped,
        OracleException raw => new OracleOperationException(metodo, new Dictionary<string, object?>(), raw.Number, raw.Message, raw),
        _ => null
    };

    private void LogFailure(Exception exception, string metodo, string usuario, string endpoint, string traceId, string body)
    {
        if (AsOracleOperation(exception, metodo) is { } oracle)
        {
            logger.LogError(exception,
                "Oracle falló en {Operacion} {OraCode} constraint={Constraint} {Parametros} metodo={Metodo} usuario={Usuario} endpoint={Endpoint} traceId={TraceId} oracle=\"{OracleMessage}\" body={Body}",
                oracle.Operation, oracle.OraCode, oracle.Constraint ?? "-", oracle.FormatParameters(), metodo, usuario, endpoint, traceId,
                oracle.OracleMessage, body);
            return;
        }

        if (exception is OracleTimeoutException)
        {
            logger.LogError(exception,
                "Oracle sin conexión ORA-03135 metodo={Metodo} usuario={Usuario} endpoint={Endpoint} traceId={TraceId} body={Body}",
                metodo, usuario, endpoint, traceId, body);
            return;
        }

        logger.LogError(exception,
            "Error no controlado {Tipo} metodo={Metodo} usuario={Usuario} endpoint={Endpoint} traceId={TraceId} body={Body}",
            exception.GetType().Name, metodo, usuario, endpoint, traceId, body);
    }

    // First stack frame inside a Veolia.Api.Modules type, as "CostosRepository.CalculartarifasAsync".
    // Async state machines and lambdas are unwrapped to the method that declared them.
    private static string? ThrowingMethod(Exception exception)
    {
        for (var current = exception; current is not null; current = current.InnerException)
        {
            foreach (var frame in new StackTrace(current, fNeedFileInfo: false).GetFrames())
            {
                if (frame.GetMethod() is { } method && Describe(method) is { } described)
                {
                    return described;
                }
            }
        }

        return null;
    }

    private static string? Describe(MethodBase method)
    {
        var type = method.DeclaringType;
        if (type is null)
        {
            return null;
        }

        var names = new List<string> { method.Name };
        while (type.DeclaringType is not null && type.Name.Contains('<'))
        {
            names.Add(type.Name);
            type = type.DeclaringType;
        }

        if (type.FullName?.StartsWith("Veolia.Api.Modules.", StringComparison.Ordinal) != true)
        {
            return null;
        }

        var name = method.Name.Contains('<') || method.Name == "MoveNext"
            ? names.Select(n => GeneratedName().Match(n)).FirstOrDefault(m => m.Success)?.Groups[1].Value ?? method.Name
            : method.Name;
        return $"{type.Name}.{name}";
    }

    [GeneratedRegex(@"<([A-Za-z_]\w*)>")]
    private static partial Regex GeneratedName();
}
