import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Copy, MessageSquare, Phone, FileText, Sparkles } from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  content: string;
  category: string;
  tags: string[];
}

const SCRIPT_TEMPLATES: Template[] = [
  {
    id: "script-cold-call-b2b",
    name: "B2B Kaltakquise - Klassisch",
    description: "Bewährtes Skript für den ersten Kaltanruf an Entscheider",
    category: "script",
    tags: ["Kaltakquise", "B2B"],
    content: `Hallo {{first_name}}, hier ist {{user_name}}.

Ich rufe an, weil ich gesehen habe, dass {{company_name}} im Bereich [Branche] tätig ist.

Wir helfen Unternehmen wie {{company_name}} dabei, [Hauptvorteil in einem Satz].

Darf ich Ihnen kurz erzählen, wie das funktioniert?

[Wenn ja:]
Wir haben für {{company_name}} eine kurze Analyse vorbereitet. Die habe ich Ihnen über LinkedIn geschickt – haben Sie die schon gesehen?

[Wenn nein:]
Kein Problem, ich schicke Ihnen einen kurzen Link. Wann hätten Sie 15 Minuten für ein Gespräch?

[Einwand "Kein Interesse":]
Das verstehe ich. Darf ich fragen – wie lösen Sie aktuell [Problem]?

[Einwand "Keine Zeit":]
Absolut verständlich. Wann passt es Ihnen besser? Ich kann auch gerne in 2 Minuten das Wichtigste zusammenfassen.

[Termin vereinbaren:]
Super, wie wäre es mit [Tag] um [Uhrzeit]? Ich schicke Ihnen direkt eine Einladung.`,
  },
  {
    id: "script-warm-call",
    name: "Warm Call - Lead hat Video gesehen",
    description: "Für Leads die bereits das Pitch Video angeschaut haben",
    category: "script",
    tags: ["Warm Call", "Video"],
    content: `Hallo {{first_name}}, hier ist {{user_name}}.

Ich sehe gerade, dass Sie sich unser Video für {{company_name}} angeschaut haben – vielen Dank dafür!

Was hat Sie am meisten angesprochen?

[Zuhören, dann:]

Genau, das ist einer unserer Kernbereiche. Für {{company_name}} sehe ich besonders Potenzial bei [spezifischer Vorteil].

Hätten Sie diese Woche 15-20 Minuten, damit ich Ihnen zeigen kann, wie das konkret für {{company_name}} aussehen würde?

[Wenn ja:]
Perfekt! Wie wäre es mit [Tag] um [Uhrzeit]?

[Wenn "erst mal mehr Infos":]
Klar, ich schicke Ihnen eine kurze Zusammenfassung per Mail. Wann kann ich mich dann nochmal melden?`,
  },
  {
    id: "script-followup-call",
    name: "Follow-up Anruf nach LinkedIn",
    description: "Anruf nachdem LinkedIn-Nachricht gesendet wurde",
    category: "script",
    tags: ["Follow-up", "LinkedIn"],
    content: `Hallo {{first_name}}, {{user_name}} hier.

Wir sind auf LinkedIn vernetzt und ich hatte Ihnen letzte Woche eine Nachricht geschickt mit einer personalisierten Seite für {{company_name}}.

Hatten Sie schon die Gelegenheit, sich das anzuschauen?

[Wenn ja:]
Super! Was denken Sie – passt das für {{company_name}}?

[Wenn nein:]
Kein Problem. In 2 Sätzen: Wir helfen [Zielgruppe] dabei, [Ergebnis]. Ich habe speziell für {{company_name}} analysiert, wo das größte Potenzial liegt.

Sollen wir einen kurzen Termin machen, damit ich Ihnen das zeigen kann?`,
  },
];

const MESSAGE_TEMPLATES: Template[] = [
  {
    id: "msg-first-connect",
    name: "Vernetzungsanfrage",
    description: "Erste LinkedIn-Vernetzungsanfrage",
    category: "message",
    tags: ["Vernetzung", "Erst-Kontakt"],
    content: `Hallo {{first_name}},

ich bin auf {{company}} aufmerksam geworden und finde euren Ansatz im Bereich [Branche] sehr spannend.

Würde mich gerne vernetzen!

Beste Grüße`,
  },
  {
    id: "msg-first-message",
    name: "Erstnachricht mit Video-Link",
    description: "Nachricht nach Vernetzung mit personalisiertem Link",
    category: "message",
    tags: ["Erstnachricht", "Video"],
    content: `Hey {{first_name}},

danke für die Vernetzung!

Ich habe mir {{company}} genauer angeschaut und eine personalisierte Seite für euch erstellt:

{{personalized_url}}

Schau gerne mal rein – bin gespannt auf dein Feedback!

LG`,
  },
  {
    id: "msg-fu1-no-view",
    name: "Follow-up 1 - Kein Klick",
    description: "3 Tage nach Erstnachricht, wenn nicht geklickt",
    category: "message",
    tags: ["Follow-up", "Erinnerung"],
    content: `Hey {{first_name}},

hast du dir meine Seite schon angeschaut?

{{personalized_url}}

Würde mich freuen, wenn du mal kurz reinschaust – habe das speziell für {{company}} vorbereitet!

LG`,
  },
  {
    id: "msg-fu2-soft",
    name: "Follow-up 2 - Sanft",
    description: "7 Tage nach FU1",
    category: "message",
    tags: ["Follow-up"],
    content: `Hey {{first_name}},

ich wollte nochmal nachhaken – hast du die Seite gesehen?

{{personalized_url}}

Falls du Fragen hast, meld dich gerne. Ansonsten kein Stress!

LG`,
  },
  {
    id: "msg-fu3-last",
    name: "Follow-up 3 - Letzter Versuch",
    description: "Letzte Nachricht",
    category: "message",
    tags: ["Follow-up", "Abschluss"],
    content: `Hey {{first_name}},

letzte Erinnerung zu meiner Seite:

{{personalized_url}}

Wenn es gerade nicht passt, kein Problem. Aber vielleicht ist es ja doch interessant für {{company}}.

LG`,
  },
  {
    id: "msg-after-view",
    name: "Nachricht nach Video-View",
    description: "Wenn Lead das Video angeschaut hat",
    category: "message",
    tags: ["Warm", "Video"],
    content: `Hey {{first_name}},

ich habe gesehen, dass du dir mein Video angeschaut hast – vielen Dank!

Was denkst du, passt das für {{company}}?

Falls ja, lass uns kurz telefonieren. Ich kann dir in 15 Min zeigen, wie das konkret aussehen würde.

Hast du diese Woche Zeit?

LG`,
  },
];

export default function TemplateLibrary() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyTemplate = (template: Template) => {
    navigator.clipboard.writeText(template.content);
    setCopiedId(template.id);
    toast.success(`"${template.name}" kopiert!`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderTemplateCard = (template: Template) => (
    <div key={template.id} className="p-4 rounded-lg border bg-card hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-sm">{template.name}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{template.description}</p>
        </div>
        <Button
          size="sm"
          variant={copiedId === template.id ? "default" : "outline"}
          onClick={() => copyTemplate(template)}
          className="shrink-0 ml-2"
        >
          <Copy className="w-3 h-3 mr-1" />
          {copiedId === template.id ? "Kopiert!" : "Kopieren"}
        </Button>
      </div>
      <div className="flex gap-1 mb-3">
        {template.tags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
        ))}
      </div>
      <pre className="text-xs bg-muted/50 rounded-md p-3 whitespace-pre-wrap font-sans text-muted-foreground max-h-40 overflow-y-auto">
        {template.content}
      </pre>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          Template-Bibliothek
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="messages">
          <TabsList className="w-full">
            <TabsTrigger value="messages" className="flex-1 gap-2">
              <MessageSquare className="w-4 h-4" />
              LinkedIn Nachrichten
            </TabsTrigger>
            <TabsTrigger value="scripts" className="flex-1 gap-2">
              <Phone className="w-4 h-4" />
              Anruf-Skripte
            </TabsTrigger>
          </TabsList>

          <TabsContent value="messages">
            <ScrollArea className="h-[500px] mt-4">
              <div className="space-y-3 pr-2">
                {MESSAGE_TEMPLATES.map(renderTemplateCard)}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="scripts">
            <ScrollArea className="h-[500px] mt-4">
              <div className="space-y-3 pr-2">
                {SCRIPT_TEMPLATES.map(renderTemplateCard)}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
