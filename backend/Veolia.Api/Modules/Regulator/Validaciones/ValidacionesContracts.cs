    namespace Veolia.Api.Modules.Regulator.Validaciones;
    
    public sealed record ValidacionRequest(int aps, int anno, int mes);
    
    public sealed record ValidacionResponse(bool ok, string? message);
    
    