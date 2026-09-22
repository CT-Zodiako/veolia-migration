namespace Veolia.Api.Infrastructure.GoogleDrive;

public sealed record GoogleSheetMetadata(int SheetId, string Title, int Index, int RowCount, int ColumnCount);
