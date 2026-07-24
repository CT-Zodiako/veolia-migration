using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using Google.Apis.Sheets.v4;
using Microsoft.Extensions.Options;

namespace Veolia.Api.Infrastructure.GoogleDrive;

public sealed class GoogleSheetsService : IGoogleSheetsService
{
    private static readonly string[] Scopes = [SheetsService.Scope.SpreadsheetsReadonly];

    private readonly GoogleDriveOptions options;
    private readonly IWebHostEnvironment environment;
    private readonly Lazy<Task<SheetsService>> client;

    public GoogleSheetsService(IOptions<GoogleDriveOptions> options, IWebHostEnvironment environment)
    {
        this.options = options.Value;
        this.environment = environment;
        client = new Lazy<Task<SheetsService>>(CreateClientAsync);
    }

    public async Task<IReadOnlyList<string>> ListTabTitlesAsync(string spreadsheetId, CancellationToken cancellationToken)
    {
        var sheets = await client.Value;
        var request = sheets.Spreadsheets.Get(spreadsheetId);
        request.Fields = "sheets(properties(title))";

        var response = await request.ExecuteAsync(cancellationToken);
        return (response.Sheets ?? [])
            .Select(sheet => sheet.Properties?.Title ?? string.Empty)
            .Where(title => title.Length > 0)
            .ToList();
    }

    public async Task<GoogleSheetTabData> ReadTabAsync(string spreadsheetId, string tabTitle, CancellationToken cancellationToken)
    {
        var sheets = await client.Value;

        // Comillas simples requeridas cuando el nombre de la pestaña tiene espacios;
        // escapamos comillas internas duplicándolas (mismo criterio que el legacy Node).
        var safeTitle = tabTitle.Replace("'", "''");
        var request = sheets.Spreadsheets.Values.Get(spreadsheetId, $"'{safeTitle}'");
        request.ValueRenderOption = SpreadsheetsResource.ValuesResource.GetRequest.ValueRenderOptionEnum.UNFORMATTEDVALUE;

        var response = await request.ExecuteAsync(cancellationToken);
        var values = response.Values ?? [];

        if (values.Count < 2)
        {
            return new GoogleSheetTabData { SheetTitle = tabTitle };
        }

        var headers = values[0].Select(header => header?.ToString() ?? string.Empty).ToList();
        var rows = values.Skip(1).Select(row =>
        {
            var dict = new Dictionary<string, object?>();
            for (var i = 0; i < headers.Count; i++)
            {
                dict[headers[i]] = i < row.Count ? row[i] : null;
            }
            return dict;
        }).ToList();

        return new GoogleSheetTabData { SheetTitle = tabTitle, Columns = headers, Rows = rows };
    }

    private async Task<SheetsService> CreateClientAsync()
    {
        var path = Path.IsPathRooted(options.CredentialsPath)
            ? options.CredentialsPath
            : Path.Combine(environment.ContentRootPath, options.CredentialsPath);

        if (!File.Exists(path))
        {
            throw new InvalidOperationException(
                $"No se encontró la credencial de Google Drive en '{path}'. Configurá GoogleDrive:CredentialsPath.");
        }

        var credential = CredentialFactory.FromFile<ServiceAccountCredential>(path).ToGoogleCredential().CreateScoped(Scopes);

        return new SheetsService(new BaseClientService.Initializer
        {
            HttpClientInitializer = credential,
            ApplicationName = "Veolia Migration"
        });
    }
}
