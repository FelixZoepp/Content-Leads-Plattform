import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Download, Upload, AlertCircle, CheckCircle2, Loader2, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ColumnMapper, { ColumnMapping } from "@/components/outreach/ColumnMapper";
import DuplicatePreview, { DuplicateMatch, DuplicateAction } from "@/components/outreach/DuplicatePreview";

interface Campaign {
  id: string;
  name: string;
  status: string;
}

interface ImportResult {
  imported_count: number;
  updated_count: number;
  skipped_count: number;
  errors: Array<{ row: number; message: string }>;
}

interface DuplicateCheckResponse {
  mode: 'check_duplicates';
  duplicates: DuplicateMatch[];
  newLeadsCount: number;
  parseErrors: Array<{ row: number; message: string }>;
}

// Parse CSV properly handling quoted values
function parseCSV(content: string): { headers: string[]; rows: string[][] } {
  const lines = content.trim().split('\n');
  if (lines.length < 1) {
    return { headers: [], rows: [] };
  }

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else if (char === ';' && !inQuotes) {
        // Support semicolon delimiter too
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(line => parseRow(line)).filter(row => row.some(cell => cell.length > 0));
  
  return { headers, rows };
}

// Apply column mapping to transform data
function applyMapping(headers: string[], rows: string[][], mappings: ColumnMapping[]): string {
  // Build new headers based on mappings
  const mappedHeaders: string[] = [];
  const columnIndices: number[] = [];
  
  mappings.forEach(mapping => {
    if (mapping.systemField) {
      const idx = headers.findIndex(h => h === mapping.csvColumn);
      if (idx !== -1) {
        mappedHeaders.push(mapping.systemField);
        columnIndices.push(idx);
      }
    }
  });
  
  // Build new CSV
  const newLines = [mappedHeaders.join(',')];
  
  rows.forEach(row => {
    const newRow = columnIndices.map(idx => {
      const value = row[idx] || '';
      // Escape quotes and wrap in quotes if contains comma
      if (value.includes(',') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    newLines.push(newRow.join(','));
  });
  
  return newLines.join('\n');
}

type ImportStep = 'upload' | 'mapping' | 'duplicates' | 'importing' | 'result';

export default function ImportLeads() {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<ImportStep>('upload');
  const [result, setResult] = useState<ImportResult | null>(null);
  
  // Column mapping state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [mappedCsvData, setMappedCsvData] = useState<string>('');
  
  // Duplicate state
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [newLeadsCount, setNewLeadsCount] = useState(0);
  const [parseErrors, setParseErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Campaign state
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const leadType = 'outbound'; // Import is only for outbound leads

  // Load campaigns for current account only
  useEffect(() => {
    const loadCampaigns = async () => {
      // First get the user's account_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      if (!profile?.account_id) return;

      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .eq('account_id', profile.account_id)
        .order('name');
      
      if (!error && data) {
        setCampaigns(data);
      }
    };
    loadCampaigns();
  }, []);

  const csvTemplate = `company_name,website,phone,mobile,street,zip,city,country,first_name,last_name,email,position,linkedin_url,source,external_id
Musterfirma GmbH,https://musterfirma.de,+49 30 12345678,+49 171 1234567,Musterstraße 1,10115,Berlin,DE,Max,Mustermann,max@musterfirma.de,Geschäftsführer,https://www.linkedin.com/in/max-mustermann,Website,ext_001
Beispiel AG,https://beispiel.de,+49 89 87654321,+49 172 7654321,Beispielweg 5,80331,München,DE,Erika,Musterfrau,erika@beispiel.de,Vertriebsleiterin,https://www.linkedin.com/in/erika-musterfrau,Messe,ext_002`;

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lead_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setResult(null);
      setStep('upload');
      
      // Parse CSV to extract headers for mapping
      try {
        const content = await selectedFile.text();
        const { headers, rows } = parseCSV(content);
        
        if (headers.length > 0) {
          setCsvHeaders(headers);
          setCsvRows(rows);
          setStep('mapping');
        } else {
          toast({
            title: "Fehler",
            description: "Die CSV-Datei enthält keine Spalten",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error parsing CSV:', error);
        toast({
          title: "Fehler",
          description: "Die CSV-Datei konnte nicht gelesen werden",
          variant: "destructive",
        });
      }
    }
  };

  const handleMappingConfirmed = async (mappings: ColumnMapping[]) => {
    // Prevent double-clicks
    if (isProcessing) return;

    // Validate campaign is selected
    if (!selectedCampaignId) {
      toast({
        title: "Kampagne erforderlich",
        description: "Bitte wähle eine Kampagne aus, bevor du fortfährst.",
        variant: "destructive",
      });
      setStep('upload');
      return;
    }

    setIsProcessing(true);

    try {
      // Transform CSV with mappings
      const transformedCsv = applyMapping(csvHeaders, csvRows, mappings);
      setMappedCsvData(transformedCsv);

      // Check for duplicates first
      const { data, error } = await supabase.functions.invoke('import-leads', {
        body: { 
          csvData: transformedCsv,
          mode: 'check_duplicates',
          leadType,
          campaignId: selectedCampaignId
        },
      });

      if (error) throw error;

      const checkResult = data as DuplicateCheckResponse;
      setDuplicates(checkResult.duplicates);
      setNewLeadsCount(checkResult.newLeadsCount);
      setParseErrors(checkResult.parseErrors || []);
      
      if (checkResult.duplicates.length > 0) {
        setStep('duplicates');
      } else {
        // No duplicates, proceed directly to import
        await performImport(transformedCsv, []);
      }
    } catch (error) {
      console.error('Duplicate check error:', error);
      toast({
        title: "Fehler bei der Duplikat-Prüfung",
        description: error instanceof Error ? error.message : "Ein Fehler ist aufgetreten",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const performImport = async (csvData: string, duplicateActions: DuplicateAction[]) => {
    setStep('importing');
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('import-leads', {
        body: { 
          csvData,
          duplicateActions,
          leadType,
          campaignId: selectedCampaignId
        },
      });

      if (error) throw error;

      setResult(data);
      setStep('result');
      
      toast({
        title: "Import abgeschlossen",
        description: `${data.imported_count} importiert, ${data.updated_count} aktualisiert, ${data.skipped_count} übersprungen`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import fehlgeschlagen",
        description: error instanceof Error ? error.message : "Ein Fehler ist aufgetreten",
        variant: "destructive",
      });
      setStep('mapping');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDuplicateConfirm = async (actions: DuplicateAction[]) => {
    await performImport(mappedCsvData, actions);
  };

  const handleCancel = () => {
    setStep('upload');
    setFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setDuplicates([]);
    setMappedCsvData('');
  };

  const handleStartOver = () => {
    setStep('upload');
    setFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setDuplicates([]);
    setMappedCsvData('');
    setResult(null);
  };

  return (
    <>
      <div className="container mx-auto py-8 px-4 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Leads importieren</h1>
          <p className="text-muted-foreground">
            Importieren Sie Outbound-Leads per CSV-Datei
          </p>
        </div>

        {step === 'upload' && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>CSV-Vorlage</CardTitle>
                <CardDescription>
                  Laden Sie unsere Vorlage herunter und füllen Sie die Pflichtfelder für den Outbound-Import aus
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={downloadTemplate} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Vorlage herunterladen
                </Button>
                
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Pflichtfelder für Outbound-Import:</h4>
                  <ul className="text-sm list-disc list-inside space-y-1">
                    <li><code>first_name</code> - Vorname</li>
                    <li><code>last_name</code> - Nachname</li>
                    <li><code>linkedin_url</code> - LinkedIn Profil-URL</li>
                  </ul>
                  
                  <h4 className="font-semibold mt-4 mb-2">Optionale Felder:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><code>company_name</code> - Firmenname</div>
                    <div><code>website</code> - Webseite</div>
                    <div><code>email</code> - E-Mail</div>
                    <div><code>phone</code> - Telefon</div>
                    <div><code>mobile</code> - Mobil</div>
                    <div><code>street</code> - Straße</div>
                    <div><code>zip</code> - PLZ</div>
                    <div><code>city</code> - Stadt</div>
                    <div><code>country</code> - Land</div>
                    <div><code>position</code> - Position</div>
                    <div><code>source</code> - Quelle</div>
                    <div><code>external_id</code> - Externe ID</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Kampagne auswählen
                </CardTitle>
                <CardDescription>
                  Jeder importierte Lead muss einer Kampagne zugeordnet werden
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign">
                    Kampagne <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={selectedCampaignId || ''}
                    onValueChange={(value) => setSelectedCampaignId(value || null)}
                  >
                    <SelectTrigger id="campaign" className={!selectedCampaignId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Kampagne wählen (Pflichtfeld)" />
                    </SelectTrigger>
                    <SelectContent>
                      {campaigns.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Keine Kampagnen vorhanden
                        </div>
                      ) : (
                        campaigns.map((campaign) => (
                          <SelectItem key={campaign.id} value={campaign.id}>
                            {campaign.name}
                            {campaign.status === 'active' && (
                              <span className="ml-2 text-xs text-green-600">(aktiv)</span>
                            )}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Outbound-Leads benötigen Vorname + Nachname + LinkedIn URL
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CSV-Datei hochladen</CardTitle>
                <CardDescription>
                  Wählen Sie Ihre CSV-Datei aus. Sie können dann die Spalten zuordnen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-muted-foreground
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-md file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary file:text-primary-foreground
                        hover:file:bg-primary/90"
                    />
                  </div>

                  {file && step === 'upload' && (
                    <Alert>
                      <CheckCircle2 className="h-4 w-4" />
                      <AlertDescription>
                        Datei ausgewählt: {file.name} ({(file.size / 1024).toFixed(2)} KB)
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {step === 'mapping' && (
          <ColumnMapper
            csvHeaders={csvHeaders}
            previewData={csvRows}
            onMappingConfirmed={handleMappingConfirmed}
            onCancel={handleCancel}
            isOutbound={true}
          />
        )}

        {step === 'duplicates' && (
          <DuplicatePreview
            duplicates={duplicates}
            newLeadsCount={newLeadsCount}
            onConfirm={handleDuplicateConfirm}
            onCancel={handleCancel}
            isProcessing={isProcessing}
          />
        )}

        {step === 'importing' && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-lg">Import läuft...</span>
                <p className="text-sm text-muted-foreground">
                  Dies kann einen Moment dauern, bitte warten Sie.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'result' && result && (
          <Card>
            <CardHeader>
              <CardTitle>Import-Ergebnis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {result.imported_count}
                  </div>
                  <div className="text-sm text-muted-foreground">Neu importiert</div>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {result.updated_count}
                  </div>
                  <div className="text-sm text-muted-foreground">Aktualisiert</div>
                </div>
                <div className="p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {result.skipped_count}
                  </div>
                  <div className="text-sm text-muted-foreground">Übersprungen</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div className="mb-6">
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {result.errors.length} Fehler beim Import aufgetreten
                    </AlertDescription>
                  </Alert>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Zeile</TableHead>
                        <TableHead>Fehlermeldung</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((error, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{error.row}</TableCell>
                          <TableCell className="text-sm">{error.message}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <Button onClick={handleStartOver} variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Weiteren Import starten
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Parse errors from duplicate check */}
        {step === 'duplicates' && parseErrors.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-sm font-medium">Hinweise zu ungültigen Zeilen</CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {parseErrors.length} Zeilen werden übersprungen (fehlende Pflichtfelder)
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
