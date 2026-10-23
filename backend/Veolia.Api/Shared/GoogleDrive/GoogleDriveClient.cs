using System.Text.Json;
using System.Text.RegularExpressions;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Google.Apis.Sheets.v4;
using Microsoft.Extensions.Options;

namespace Veolia.Api.Infrastructure.GoogleDrive;

/// <summary>
/// Google implementation of <see cref="IGoogleDriveClient"/> with read-only scopes (legacy readFolder.js SCOPES).
/// Drive v3 is called over REST with the service-account token because only the Sheets client library is referenced.
/// </summary>
public sealed class GoogleDriveClient : IGoogleDriveClient
{
    private static readonly string[] Scopes =
    [
        "https://www.googleapis.com/auth/drive.readonly",
        SheetsService.Scope.SpreadsheetsReadonly
    ];
    private static readonly HttpClient Http = new() { BaseAddress = new Uri("https://www.googleapis.com/drive/v3/") };

    private readonly GoogleDriveOptions options;
    private readonly IWebHostEnvironment environment;
    private readonly Lazy<Task<(GoogleCredential Credential, SheetsService Sheets)>> clients;

    public GoogleDriveClient(IOptions<GoogleDriveOptions> options, IWebHostEnvironment environment)
    {
        this.options = options.Value;
        this.environment = environment;
        clients = new Lazy<Task<(GoogleCredential, SheetsService)>>(CreateClientsAsync);
    }

    public Task<IReadOnlyList<GoogleDriveItem>> ListSubfoldersAsync(string folderId, CancellationToken ct)
        => ListFilesAsync(folderId, "application/vnd.google-apps.folder", ct);

    public Task<IReadOnlyList<GoogleDriveItem>> ListSpreadsheetsAsync(string folderId, CancellationToken ct)
        => ListFilesAsync(folderId, "application/vnd.google-apps.spreadsheet", ct);

    public async Task<IReadOnlyList<string>> ListTabTitlesAsync(string spreadsheetId, CancellationToken ct)
    {
        var (_, sheets) = await clients.Value;
        var request = sheets.Spreadsheets.Get(spreadsheetId);
        request.Fields = "sheets(properties(title))";
        var response = await request.ExecuteAsync(ct);
        return (response.Sheets ?? []).Select(s => s.Properties?.Title ?? "").Where(t => t.Length > 0).ToList();
    }

    public async Task<GoogleSheetTabData> ReadTabAsync(string spreadsheetId, string tabTitle, CancellationToken ct)
    {
        var (_, sheets) = await clients.Value;
        var request = sheets.Spreadsheets.Values.Get(spreadsheetId, $"'{tabTitle.Replace("'", "''")}'");
        request.ValueRenderOption = SpreadsheetsResource.ValuesResource.GetRequest.ValueRenderOptionEnum.UNFORMATTEDVALUE;
        request.DateTimeRenderOption = SpreadsheetsResource.ValuesResource.GetRequest.DateTimeRenderOptionEnum.FORMATTEDSTRING;
        var values = (await request.ExecuteAsync(ct)).Values ?? [];

        // Legacy readTab: fewer than 2 rows → no data; missing cells → "".
        if (values.Count < 2) return new GoogleSheetTabData { SheetTitle = tabTitle };
        var headers = values[0].Select(h => h?.ToString() ?? "").ToList();
        var rows = values.Skip(1).Select(row =>
        {
            var dict = new Dictionary<string, object?>();
            for (var i = 0; i < headers.Count; i++) dict[headers[i]] = i < row.Count ? row[i] ?? "" : "";
            return dict;
        }).ToList();
        return new GoogleSheetTabData { SheetTitle = tabTitle, Columns = headers, Rows = rows };
    }

    private async Task<IReadOnlyList<GoogleDriveItem>> ListFilesAsync(string folderId, string mimeType, CancellationToken ct)
    {
        if (!Regex.IsMatch(folderId, @"\A[A-Za-z0-9_-]+\z")) throw new ArgumentException("folderId inválido.");
        var (credential, _) = await clients.Value;
        var q = Uri.EscapeDataString($"'{folderId}' in parents and mimeType = '{mimeType}' and trashed = false");
        var result = new List<GoogleDriveItem>();
        string? pageToken = null;
        do
        {
            var url = $"files?q={q}&fields=nextPageToken,files(id,name)&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true"
                + (pageToken is null ? "" : "&pageToken=" + Uri.EscapeDataString(pageToken));
            using var message = new HttpRequestMessage(HttpMethod.Get, url);
            message.Headers.Authorization = new("Bearer", await credential.UnderlyingCredential.GetAccessTokenForRequestAsync(cancellationToken: ct));
            using var response = await Http.SendAsync(message, ct);
            response.EnsureSuccessStatusCode();
            using var json = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(ct), cancellationToken: ct);
            if (json.RootElement.TryGetProperty("files", out var files))
                result.AddRange(files.EnumerateArray().Select(f => new GoogleDriveItem(
                    f.GetProperty("id").GetString() ?? "", f.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "")));
            pageToken = json.RootElement.TryGetProperty("nextPageToken", out var next) ? next.GetString() : null;
        } while (!string.IsNullOrEmpty(pageToken));
        return result;
    }

    private Task<(GoogleCredential, SheetsService)> CreateClientsAsync()
    {
        var path = Path.IsPathRooted(options.CredentialsPath)
            ? options.CredentialsPath
            : Path.Combine(environment.ContentRootPath, options.CredentialsPath);
        if (!File.Exists(path))
            throw new InvalidOperationException(
                $"No se encontró la credencial de Google Drive en '{path}'. Configurá GoogleDrive:CredentialsPath.");

        var credential = CredentialFactory.FromFile<ServiceAccountCredential>(path).ToGoogleCredential().CreateScoped(Scopes);
        var sheets = new SheetsService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "Veolia Migration"
        });
        return Task.FromResult((credential, sheets));
    }
}
