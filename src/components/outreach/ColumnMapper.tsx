import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

export interface ColumnMapping {
  csvColumn: string;
  systemField: string | null;
}

export interface SystemField {
  key: string;
  label: string;
  required?: boolean;
  category: 'contact' | 'company';
}

const SYSTEM_FIELDS: SystemField[] = [
  // Contact fields
  { key: 'first_name', label: 'Vorname', required: false, category: 'contact' },
  { key: 'last_name', label: 'Nachname', required: false, category: 'contact' },
  { key: 'email', label: 'E-Mail', required: false, category: 'contact' },
  { key: 'phone', label: 'Telefon', required: false, category: 'contact' },
  { key: 'mobile', label: 'Mobil', required: false, category: 'contact' },
  { key: 'position', label: 'Position', required: false, category: 'contact' },
  { key: 'linkedin_url', label: 'LinkedIn URL', required: false, category: 'contact' },
  { key: 'source', label: 'Quelle', required: false, category: 'contact' },
  { key: 'external_id', label: 'Externe ID', required: false, category: 'contact' },
  // Company fields
  { key: 'company_name', label: 'Firmenname', required: false, category: 'company' },
  { key: 'website', label: 'Website', required: false, category: 'company' },
  { key: 'street', label: 'Straße', required: false, category: 'company' },
  { key: 'zip', label: 'PLZ', required: false, category: 'company' },
  { key: 'city', label: 'Stadt', required: false, category: 'company' },
  { key: 'country', label: 'Land', required: false, category: 'company' },
];

// Auto-detect mapping based on column name similarity
function autoDetectMapping(csvColumn: string): string | null {
  const normalizedColumn = csvColumn.toLowerCase().trim().replace(/[_\-\s]/g, '');
  
  const mappings: Record<string, string[]> = {
    'first_name': ['vorname', 'firstname', 'givenname', 'fname'],
    'last_name': ['nachname', 'lastname', 'familyname', 'surname', 'lname'],
    'email': ['email', 'emailaddress', 'mail', 'emailadresse'],
    'phone': ['phone', 'telefon', 'telephone', 'tel', 'phonenumber', 'telefonnummer'],
    'mobile': ['mobile', 'mobil', 'handy', 'mobilnummer', 'cellphone', 'cell'],
    'position': ['position', 'title', 'jobtitle', 'rolle', 'funktion', 'job', 'titel'],
    'linkedin_url': [
      'linkedin',
      'linkedinurl',
      'linkedinprofil',
      'linkedinprofile',
      'linkedinprofilurl',
      'linkedinprofileurl',
      'linkedinlink',
      'profilurl',
      'profileurl',
      'profillink',
      'profilelink',
    ],
    'source': ['source', 'quelle', 'herkunft', 'origin'],
    'external_id': ['externalid', 'externeid', 'id', 'customerid', 'kundennummer'],
    'company_name': ['company', 'companyname', 'firma', 'firmenname', 'unternehmen', 'organisation', 'organization'],
    'website': ['website', 'webseite', 'url', 'homepage', 'web'],
    'street': ['street', 'strasse', 'straße', 'address', 'adresse'],
    'zip': ['zip', 'plz', 'postcode', 'postalcode', 'postleitzahl'],
    'city': ['city', 'stadt', 'ort', 'town'],
    'country': ['country', 'land', 'nation'],
  };
  
  for (const [systemField, aliases] of Object.entries(mappings)) {
    if (aliases.some(alias => normalizedColumn.includes(alias) || alias.includes(normalizedColumn))) {
      return systemField;
    }
  }
  
  return null;
}

const OUTBOUND_REQUIRED_FIELDS: string[] = [];

interface ColumnMapperProps {
  csvHeaders: string[];
  previewData: string[][];
  onMappingConfirmed: (mappings: ColumnMapping[]) => void;
  onCancel: () => void;
  isOutbound?: boolean;
}

export default function ColumnMapper({ 
  csvHeaders, 
  previewData, 
  onMappingConfirmed,
  onCancel,
  isOutbound = false,
}: ColumnMapperProps) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);

  useEffect(() => {
    // Auto-detect mappings on load
    const initialMappings = csvHeaders.map(header => ({
      csvColumn: header,
      systemField: autoDetectMapping(header),
    }));
    setMappings(initialMappings);
  }, [csvHeaders]);

  const handleMappingChange = (csvColumn: string, systemField: string | null) => {
    setMappings(prev => prev.map(m => 
      m.csvColumn === csvColumn 
        ? { ...m, systemField: systemField === 'ignore' ? null : systemField }
        : m
    ));
  };

  const getUsedFields = () => {
    return mappings
      .filter(m => m.systemField)
      .map(m => m.systemField);
  };

  const getMappingStatus = () => {
    const mapped = mappings.filter(m => m.systemField).length;
    const total = mappings.length;
    return { mapped, total };
  };

  const { mapped, total } = getMappingStatus();
  const usedFields = getUsedFields();
  
  const missingRequired = isOutbound
    ? OUTBOUND_REQUIRED_FIELDS.filter(f => !usedFields.includes(f))
    : [];
  const allRequiredMapped = missingRequired.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5" />
          Spalten zuordnen
        </CardTitle>
        <CardDescription>
          Ordnen Sie die Spalten aus Ihrer CSV-Datei den Systemfeldern zu. 
          Spalten ohne Zuordnung werden ignoriert.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status */}
        <div className="flex items-center gap-4">
          <Badge variant={mapped > 0 ? "default" : "secondary"}>
            {mapped} von {total} Spalten zugeordnet
          </Badge>
          {mapped > 0 && (
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Bereit zum Import
            </span>
          )}
        </div>

        {/* Mapping Table */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">CSV-Spalte</TableHead>
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="w-[200px]">Systemfeld</TableHead>
                <TableHead>Vorschau (erste 3 Zeilen)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappings.map((mapping, idx) => (
                <TableRow key={mapping.csvColumn}>
                  <TableCell className="font-medium">
                    <code className="bg-muted px-2 py-1 rounded text-sm">
                      {mapping.csvColumn}
                    </code>
                  </TableCell>
                  <TableCell>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={mapping.systemField || 'ignore'}
                      onValueChange={(value) => handleMappingChange(mapping.csvColumn, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Feld auswählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ignore">
                          <span className="text-muted-foreground">— Ignorieren —</span>
                        </SelectItem>
                        
                        <SelectItem disabled value="contact-header">
                          <span className="font-semibold text-xs uppercase">Kontakt</span>
                        </SelectItem>
                        {SYSTEM_FIELDS.filter(f => f.category === 'contact').map(field => {
                          const isRequired = isOutbound && OUTBOUND_REQUIRED_FIELDS.includes(field.key);
                          return (
                          <SelectItem 
                            key={field.key} 
                            value={field.key}
                            disabled={usedFields.includes(field.key) && mapping.systemField !== field.key}
                          >
                            {field.label}{isRequired && ' *'}
                            {usedFields.includes(field.key) && mapping.systemField !== field.key && (
                              <span className="text-muted-foreground ml-2">(bereits zugeordnet)</span>
                            )}
                          </SelectItem>
                          );
                        })}
                        
                        <SelectItem disabled value="company-header">
                          <span className="font-semibold text-xs uppercase">Firma</span>
                        </SelectItem>
                        {SYSTEM_FIELDS.filter(f => f.category === 'company').map(field => (
                          <SelectItem 
                            key={field.key} 
                            value={field.key}
                            disabled={usedFields.includes(field.key) && mapping.systemField !== field.key}
                          >
                            {field.label}
                            {usedFields.includes(field.key) && mapping.systemField !== field.key && (
                              <span className="text-muted-foreground ml-2">(bereits zugeordnet)</span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {previewData.slice(0, 3).map((row, rowIdx) => (
                        <Badge key={rowIdx} variant="outline" className="text-xs font-normal">
                          {row[idx]?.substring(0, 25) || '—'}
                          {row[idx]?.length > 25 && '...'}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Warning if no mappings */}
        {mapped === 0 && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              Bitte ordnen Sie mindestens eine Spalte zu, um den Import zu starten.
            </span>
          </div>
        )}

        {/* Warning for missing required outbound fields */}
        {isOutbound && missingRequired.length > 0 && mapped > 0 && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">
              Pflichtfelder für Outbound-Import fehlen: {missingRequired.map(f => {
                const field = SYSTEM_FIELDS.find(sf => sf.key === f);
                return field?.label || f;
              }).join(', ')}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel}>
            Abbrechen
          </Button>
          <Button 
            onClick={() => onMappingConfirmed(mappings)}
            disabled={mapped === 0 || (isOutbound && !allRequiredMapped)}
          >
            Import starten ({mapped} Felder)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
