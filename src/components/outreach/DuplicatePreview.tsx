import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle2, UserPlus, RefreshCw, SkipForward, Users } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface DuplicateMatch {
  csvRowIndex: number;
  csvData: Record<string, string>;
  existingContact: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    company: string | null;
    linkedin_url: string | null;
  };
  matchReason: 'email' | 'linkedin' | 'name_company';
}

export interface DuplicateAction {
  csvRowIndex: number;
  action: 'update' | 'skip' | 'create';
}

interface DuplicatePreviewProps {
  duplicates: DuplicateMatch[];
  newLeadsCount: number;
  onConfirm: (actions: DuplicateAction[]) => void;
  onCancel: () => void;
  isProcessing: boolean;
}

export default function DuplicatePreview({
  duplicates,
  newLeadsCount,
  onConfirm,
  onCancel,
  isProcessing,
}: DuplicatePreviewProps) {
  const [actions, setActions] = useState<Record<number, 'update' | 'skip' | 'create'>>(() => {
    // Default all to 'update'
    const initial: Record<number, 'update' | 'skip' | 'create'> = {};
    duplicates.forEach(d => {
      initial[d.csvRowIndex] = 'update';
    });
    return initial;
  });

  const handleActionChange = (csvRowIndex: number, action: 'update' | 'skip' | 'create') => {
    setActions(prev => ({ ...prev, [csvRowIndex]: action }));
  };

  const handleSetAllAction = (action: 'update' | 'skip' | 'create') => {
    const newActions: Record<number, 'update' | 'skip' | 'create'> = {};
    duplicates.forEach(d => {
      newActions[d.csvRowIndex] = action;
    });
    setActions(newActions);
  };

  const handleConfirm = () => {
    const actionList: DuplicateAction[] = Object.entries(actions).map(([rowIndex, action]) => ({
      csvRowIndex: parseInt(rowIndex),
      action,
    }));
    onConfirm(actionList);
  };

  const getMatchReasonLabel = (reason: DuplicateMatch['matchReason']) => {
    switch (reason) {
      case 'email':
        return 'E-Mail';
      case 'linkedin':
        return 'LinkedIn';
      case 'name_company':
        return 'Name + Firma';
    }
  };

  const getMatchReasonColor = (reason: DuplicateMatch['matchReason']) => {
    switch (reason) {
      case 'email':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'linkedin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'name_company':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
    }
  };

  const actionCounts = {
    update: Object.values(actions).filter(a => a === 'update').length,
    skip: Object.values(actions).filter(a => a === 'skip').length,
    create: Object.values(actions).filter(a => a === 'create').length,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Duplikat-Prüfung
        </CardTitle>
        <CardDescription>
          Es wurden {duplicates.length} mögliche Duplikate gefunden. Wählen Sie für jeden Eintrag, 
          wie damit verfahren werden soll.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{newLeadsCount}</div>
            <div className="text-sm text-muted-foreground">Neue Leads</div>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{duplicates.length}</div>
            <div className="text-sm text-muted-foreground">Duplikate</div>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{actionCounts.update}</div>
            <div className="text-sm text-muted-foreground">Aktualisieren</div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{actionCounts.skip}</div>
            <div className="text-sm text-muted-foreground">Überspringen</div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium mr-2">Alle Duplikate:</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleSetAllAction('update')}
            className="gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Aktualisieren
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleSetAllAction('skip')}
            className="gap-1"
          >
            <SkipForward className="h-3 w-3" />
            Überspringen
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => handleSetAllAction('create')}
            className="gap-1"
          >
            <UserPlus className="h-3 w-3" />
            Neu erstellen
          </Button>
        </div>

        {/* Duplicates Table */}
        <ScrollArea className="h-[400px] border rounded-lg">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-[50px]">Zeile</TableHead>
                <TableHead>CSV-Daten</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Vorhandener Kontakt</TableHead>
                <TableHead className="w-[200px]">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {duplicates.map((dup) => (
                <TableRow key={dup.csvRowIndex}>
                  <TableCell className="font-mono text-sm">{dup.csvRowIndex + 2}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">
                        {dup.csvData.first_name} {dup.csvData.last_name}
                      </div>
                      {dup.csvData.email && (
                        <div className="text-muted-foreground">{dup.csvData.email}</div>
                      )}
                      {dup.csvData.company_name && (
                        <div className="text-muted-foreground">{dup.csvData.company_name}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getMatchReasonColor(dup.matchReason)}>
                      {getMatchReasonLabel(dup.matchReason)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">
                        {dup.existingContact.first_name} {dup.existingContact.last_name}
                      </div>
                      {dup.existingContact.email && (
                        <div className="text-muted-foreground">{dup.existingContact.email}</div>
                      )}
                      {dup.existingContact.company && (
                        <div className="text-muted-foreground">{dup.existingContact.company}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <RadioGroup
                      value={actions[dup.csvRowIndex]}
                      onValueChange={(value) => handleActionChange(dup.csvRowIndex, value as 'update' | 'skip' | 'create')}
                      className="flex flex-col gap-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="update" id={`update-${dup.csvRowIndex}`} />
                        <Label htmlFor={`update-${dup.csvRowIndex}`} className="text-xs cursor-pointer">
                          Aktualisieren
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="skip" id={`skip-${dup.csvRowIndex}`} />
                        <Label htmlFor={`skip-${dup.csvRowIndex}`} className="text-xs cursor-pointer">
                          Überspringen
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="create" id={`create-${dup.csvRowIndex}`} />
                        <Label htmlFor={`create-${dup.csvRowIndex}`} className="text-xs cursor-pointer">
                          Neu erstellen
                        </Label>
                      </div>
                    </RadioGroup>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Warning */}
        {actionCounts.create > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-lg">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">
              {actionCounts.create} Duplikat(e) werden als neue Kontakte erstellt. 
              Dies kann zu doppelten Einträgen führen.
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={isProcessing}>
            Abbrechen
          </Button>
          <Button onClick={handleConfirm} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Importiere...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Import starten ({newLeadsCount + actionCounts.update + actionCounts.create} Einträge)
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
