using System.Globalization;

namespace Veolia.Api.Infrastructure.GoogleDrive;

public sealed record GoogleDriveItem(string Id, string Name);

/// <summary>
/// Read-only Drive/Sheets primitives used by the harvest. Kept behind an interface so the
/// folder walk and filters are testable without calling Google.
/// </summary>
public interface IGoogleDriveClient
{
    Task<IReadOnlyList<GoogleDriveItem>> ListSubfoldersAsync(string folderId, CancellationToken ct);
    Task<IReadOnlyList<GoogleDriveItem>> ListSpreadsheetsAsync(string folderId, CancellationToken ct);
    Task<IReadOnlyList<string>> ListTabTitlesAsync(string spreadsheetId, CancellationToken ct);

    /// <summary>Rows as header→value; values UNFORMATTED, dates/times as FORMATTED_STRING (legacy readTab).</summary>
    Task<GoogleSheetTabData> ReadTabAsync(string spreadsheetId, string tabTitle, CancellationToken ct);
}

public sealed record DriveHarvestRequest(string FolderId, string SheetTitle, string FileNameFilter, string Year, string? Month = null);

/// <summary>One matching spreadsheet. <see cref="Error"/> is set when the file could not be read;
/// a missing tab is reported in <see cref="GoogleSheetTabData.Error"/> with no rows (legacy shape).</summary>
public sealed record DriveHarvestFile(string? MonthFolder, string FileId, string FileName, GoogleSheetTabData? Tab, string? Error);

public interface IGoogleDriveHarvestService
{
    Task<IReadOnlyList<DriveHarvestFile>> HarvestAsync(DriveHarvestRequest request, CancellationToken ct);
}

/// <summary>
/// Port of legacy back-tarificador/src/helpers/readFolder.js harvestByFolderId: walk the folder's
/// subfolders (or the root when it has none), keep spreadsheets whose name contains the APS name,
/// the year and the optional month, and read the requested tab.
/// </summary>
public sealed class GoogleDriveHarvestService(IGoogleDriveClient client) : IGoogleDriveHarvestService
{
    public async Task<IReadOnlyList<DriveHarvestFile>> HarvestAsync(DriveHarvestRequest request, CancellationToken ct)
    {
        // Legacy CVA controller driveHarvestByFolderId validations.
        if (string.IsNullOrWhiteSpace(request.FolderId)) throw new ArgumentException("folderId es requerido");
        if (string.IsNullOrWhiteSpace(request.SheetTitle)) throw new ArgumentException("sheetTitle es requerido");
        if (string.IsNullOrWhiteSpace(request.FileNameFilter)) throw new ArgumentException("filterName es requerido");
        if (string.IsNullOrWhiteSpace(request.Year) || !decimal.TryParse(request.Year.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out _))
            throw new ArgumentException("filterYear es requerido y debe ser un número");

        var name = request.FileNameFilter.Trim();
        var year = request.Year.Trim();
        var title = request.SheetTitle.Trim();
        var month = string.IsNullOrWhiteSpace(request.Month) ? null : request.Month.Trim();
        var result = new List<DriveHarvestFile>();

        var subfolders = await client.ListSubfoldersAsync(request.FolderId, ct);
        if (subfolders.Count == 0)
        {
            foreach (var file in (await client.ListSpreadsheetsAsync(request.FolderId, ct)).Where(f => Matches(f.Name, name, year, month)))
                result.Add(await ReadAsync(null, file, title, ct));
            return result;
        }

        foreach (var folder in subfolders.OrderBy(f => f.Name, NaturalSpanishComparer.Instance))
        {
            // Legacy also skipped subfolders without the month in their name, but facturación folders are
            // not necessarily named by month, so the month filter applies to file names only.
            foreach (var file in (await client.ListSpreadsheetsAsync(folder.Id, ct)).Where(f => Matches(f.Name, name, year, month)))
                result.Add(await ReadAsync(folder.Name, file, title, ct));
        }
        return result;
    }

    private async Task<DriveHarvestFile> ReadAsync(string? monthFolder, GoogleDriveItem file, string wantedTitle, CancellationToken ct)
    {
        try
        {
            var titles = await client.ListTabTitlesAsync(file.Id, ct);
            var found = titles.FirstOrDefault(t => string.Equals(t, wantedTitle, StringComparison.OrdinalIgnoreCase));
            var tab = found is null
                ? new GoogleSheetTabData { SheetTitle = wantedTitle, Error = $"Sheet \"{wantedTitle}\" not found" }
                : await client.ReadTabAsync(file.Id, found, ct);
            return new DriveHarvestFile(monthFolder, file.Id, file.Name, tab, null);
        }
        catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
        {
            return new DriveHarvestFile(monthFolder, file.Id, file.Name, null, ex.Message);
        }
    }

    private static bool Matches(string fileName, string name, string year, string? month)
        => Contains(fileName, name) && Contains(fileName, year) && (month is null || Contains(fileName, month));

    private static bool Contains(string? value, string part) => (value ?? "").Contains(part, StringComparison.OrdinalIgnoreCase);

    /// <summary>Approximates JS <c>a.localeCompare(b, "es", { numeric: true })</c>: digit runs compare numerically.</summary>
    private sealed class NaturalSpanishComparer : IComparer<string>
    {
        public static readonly NaturalSpanishComparer Instance = new();
        private static readonly CompareInfo Spanish = CultureInfo.GetCultureInfo("es").CompareInfo;

        public int Compare(string? x, string? y)
        {
            x ??= ""; y ??= "";
            int i = 0, j = 0;
            while (i < x.Length && j < y.Length)
            {
                if (char.IsDigit(x[i]) && char.IsDigit(y[j]))
                {
                    var (a, nextI) = Run(x, i, true); var (b, nextJ) = Run(y, j, true);
                    var byNumber = decimal.Parse(a, CultureInfo.InvariantCulture).CompareTo(decimal.Parse(b, CultureInfo.InvariantCulture));
                    if (byNumber != 0) return byNumber;
                    i = nextI; j = nextJ;
                }
                else
                {
                    var (a, nextI) = Run(x, i, false); var (b, nextJ) = Run(y, j, false);
                    var byText = Spanish.Compare(a, b, CompareOptions.None);
                    if (byText != 0) return byText;
                    i = nextI; j = nextJ;
                }
            }
            return (x.Length - i).CompareTo(y.Length - j);
        }

        private static (string Run, int Next) Run(string s, int start, bool digits)
        {
            var end = start;
            while (end < s.Length && char.IsDigit(s[end]) == digits && end - start < 28) end++;
            return (s[start..end], end);
        }
    }
}
