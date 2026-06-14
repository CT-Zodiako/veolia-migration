namespace Veolia.Api.Exceptions;

public sealed class NotFoundException(string message) : Exception(message);

public sealed class ConflictException(string message) : Exception(message);

public sealed class OracleTimeoutException(string message) : Exception(message);

public sealed class PreconditionFailedException(string message) : Exception(message);
