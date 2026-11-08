namespace Veolia.Api.Infrastructure.Errors;

public static class ErrorHandlingExtensions
{
    public static IServiceCollection AddGlobalErrorHandling(this IServiceCollection services)
    {
        services.AddExceptionHandler<GlobalExceptionHandler>();
        return services;
    }

    // Register before UseCors: CORS headers are applied when the error response starts, so the
    // frontend can still read the 500 body. GlobalExceptionHandler already logs, hence the
    // middleware's own diagnostics are suppressed (one Error entry per failure).
    public static IApplicationBuilder UseGlobalErrorHandling(this IApplicationBuilder app)
    {
        app.UseExceptionHandler(new ExceptionHandlerOptions
        {
            ExceptionHandler = _ => Task.CompletedTask,
            SuppressDiagnosticsCallback = _ => true
        });
        app.Use((context, next) =>
        {
            RequestBodyCapture.EnableFor(context.Request);
            return next(context);
        });
        return app;
    }
}
