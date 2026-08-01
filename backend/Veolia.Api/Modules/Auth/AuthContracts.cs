namespace Veolia.Api.Modules.Auth;

public enum LoginOutcomeKind
{
    Success,
    InvalidCredentials,
    InvalidSystem
}

public sealed record LoginRepositoryResult(
    LoginOutcomeKind Kind,
    string Message,
    object? Usuario = null,
    object? Sistema = null,
    string? AuthToken = null);

public sealed record SwitchSistemaRepositoryResult(
    LoginOutcomeKind Kind,
    string Message,
    object? Sistema = null,
    string? AuthToken = null);

public sealed record UserMutationRepositoryResult(
    bool IsDuplicateEmail,
    object? Payload,
    string? Message = null);
