import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, FileText, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { jsPDF } from "jspdf";

interface AvvAgreementProps {
  onAcceptChange?: (accepted: boolean) => void;
  showAcceptCheckbox?: boolean;
  initialAccepted?: boolean;
}

const AVV_TEXT = `Auftragsverarbeitungsvertrag (Kurzfassung)

1. Gegenstand der Verarbeitung

pitchfirst.io verarbeitet personenbezogene Daten ausschließlich zur technischen Bereitstellung, Wartung und Sicherstellung des Plattformbetriebs.

2. Art der Daten

• Bestandsdaten (z. B. Benutzerkonten)
• Technische Nutzungsdaten
• vom Nutzer gespeicherte Inhalte (nur technisch, nicht inhaltlich)

3. Zweck der Verarbeitung

Ausschließlich zur Erbringung der vertraglich geschuldeten Softwareleistung.

4. Weisungsgebundenheit

Die Verarbeitung erfolgt ausschließlich auf Weisung des Nutzers.
pitchfirst.io trifft keine eigenen Entscheidungen über Zwecke oder Mittel der Verarbeitung.

5. Pflichten des Nutzers

Der Nutzer ist verantwortlich für:
• Rechtmäßigkeit der Datenverarbeitung
• Einholung erforderlicher Einwilligungen
• Erfüllung von Informationspflichten gegenüber Betroffenen

6. Technische und organisatorische Maßnahmen

pitchfirst.io setzt geeignete technische und organisatorische Maßnahmen gemäß Art. 32 DSGVO ein, insbesondere:
• Zugriffsbeschränkungen
• Verschlüsselung
• Rollen- und Berechtigungskonzepte

7. Unterauftragsverarbeiter

Der Nutzer stimmt dem Einsatz technischer Unterauftragsverarbeiter (z. B. Hosting, Infrastruktur) zu, insbesondere Supabase.`;

export default function AvvAgreement({ 
  onAcceptChange, 
  showAcceptCheckbox = true,
  initialAccepted = false 
}: AvvAgreementProps) {
  const [accepted, setAccepted] = useState(initialAccepted);
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchAvvStatus();
  }, []);

  const fetchAvvStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('avv_accepted_at')
        .eq('id', user.id)
        .single();

      if (profile?.avv_accepted_at) {
        setAcceptedAt(profile.avv_accepted_at);
        setAccepted(true);
      }
    } catch (error) {
      console.error('Error fetching AVV status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptChange = (checked: boolean) => {
    setAccepted(checked);
    onAcceptChange?.(checked);
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Set font
      doc.setFont('helvetica');

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Auftragsverarbeitungsvertrag', 20, 25);
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('(Kurzfassung gemäß Art. 28 DSGVO)', 20, 33);

      // Company info
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text('pitchfirst.io', 20, 42);
      doc.text(`Stand: ${format(new Date(), "dd.MM.yyyy", { locale: de })}`, 20, 47);
      doc.setTextColor(0, 0, 0);

      // Divider line
      doc.setDrawColor(200, 200, 200);
      doc.line(20, 52, 190, 52);

      // Content sections
      const sections = [
        {
          title: '1. Gegenstand der Verarbeitung',
          content: 'pitchfirst.io verarbeitet personenbezogene Daten ausschließlich zur technischen Bereitstellung, Wartung und Sicherstellung des Plattformbetriebs.'
        },
        {
          title: '2. Art der Daten',
          content: '• Bestandsdaten (z. B. Benutzerkonten)\n• Technische Nutzungsdaten\n• vom Nutzer gespeicherte Inhalte (nur technisch, nicht inhaltlich)'
        },
        {
          title: '3. Zweck der Verarbeitung',
          content: 'Ausschließlich zur Erbringung der vertraglich geschuldeten Softwareleistung.'
        },
        {
          title: '4. Weisungsgebundenheit',
          content: 'Die Verarbeitung erfolgt ausschließlich auf Weisung des Nutzers. pitchfirst.io trifft keine eigenen Entscheidungen über Zwecke oder Mittel der Verarbeitung.'
        },
        {
          title: '5. Pflichten des Nutzers',
          content: 'Der Nutzer ist verantwortlich für:\n• Rechtmäßigkeit der Datenverarbeitung\n• Einholung erforderlicher Einwilligungen\n• Erfüllung von Informationspflichten gegenüber Betroffenen'
        },
        {
          title: '6. Technische und organisatorische Maßnahmen',
          content: 'pitchfirst.io setzt geeignete technische und organisatorische Maßnahmen gemäß Art. 32 DSGVO ein, insbesondere:\n• Zugriffsbeschränkungen\n• Verschlüsselung\n• Rollen- und Berechtigungskonzepte'
        },
        {
          title: '7. Unterauftragsverarbeiter',
          content: 'Der Nutzer stimmt dem Einsatz technischer Unterauftragsverarbeiter (z. B. Hosting, Infrastruktur) zu, insbesondere Supabase.'
        }
      ];

      let yPos = 60;
      const pageHeight = 280;
      const marginLeft = 20;
      const maxWidth = 170;

      sections.forEach((section) => {
        // Check if we need a new page
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = 25;
        }

        // Section title
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(section.title, marginLeft, yPos);
        yPos += 7;

        // Section content
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const lines = doc.splitTextToSize(section.content, maxWidth);
        doc.text(lines, marginLeft, yPos);
        yPos += lines.length * 5 + 8;
      });

      // Footer with acceptance info if available
      if (acceptedAt) {
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 25;
        }
        
        yPos += 10;
        doc.setDrawColor(200, 200, 200);
        doc.line(20, yPos, 190, yPos);
        yPos += 8;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Zustimmung', marginLeft, yPos);
        yPos += 6;
        
        doc.setFont('helvetica', 'normal');
        doc.text(`Akzeptiert am: ${format(new Date(acceptedAt), "dd.MM.yyyy 'um' HH:mm 'Uhr'", { locale: de })}`, marginLeft, yPos);
      }

      // Save the PDF
      doc.save('AVV-pitchfirst.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Auftragsverarbeitungsvertrag (AVV)
            </CardTitle>
            <CardDescription>
              DSGVO-konforme Vereinbarung zur Datenverarbeitung
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {acceptedAt && (
              <Badge variant="outline" className="flex items-center gap-1 text-green-600 border-green-600">
                <CheckCircle className="h-3 w-3" />
                Akzeptiert am {format(new Date(acceptedAt), "dd.MM.yyyy", { locale: de })}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              disabled={downloading}
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              PDF herunterladen
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ScrollArea className="h-64 rounded-lg border bg-muted/30 p-4">
          <div className="whitespace-pre-wrap text-sm text-muted-foreground">
            {AVV_TEXT}
          </div>
        </ScrollArea>

        {showAcceptCheckbox && !acceptedAt && (
          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="avv-accept"
              checked={accepted}
              onCheckedChange={(checked) => handleAcceptChange(checked === true)}
              className="mt-0.5"
            />
            <Label 
              htmlFor="avv-accept" 
              className="text-sm font-normal cursor-pointer leading-relaxed"
            >
              Ich habe den Auftragsverarbeitungsvertrag gelesen und akzeptiere die darin enthaltenen Bedingungen.
            </Label>
          </div>
        )}

        {acceptedAt && (
          <p className="text-sm text-muted-foreground">
            Du hast den AVV bereits akzeptiert. Falls du Fragen hast, kontaktiere uns unter{" "}
            <a href="mailto:support@pitchfirst.io" className="text-primary hover:underline">
              support@pitchfirst.io
            </a>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
