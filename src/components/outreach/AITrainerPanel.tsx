import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Brain, Lightbulb, Mic, MicOff, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ObjectionHandling {
  objection: string;
  response: string;
  timestamp: string;
}

interface AITrainerPanelProps {
  isActive: boolean;
  status: 'disconnected' | 'connecting' | 'listening' | 'transcribing' | 'analyzing' | 'active';
  objections: ObjectionHandling[];
  error?: string;
}

const AITrainerPanel: React.FC<AITrainerPanelProps> = ({
  isActive,
  status,
  objections,
  error
}) => {
  const getStatusDisplay = () => {
    switch (status) {
      case 'disconnected':
        return { icon: MicOff, text: 'Nicht verbunden', color: 'text-muted-foreground' };
      case 'connecting':
        return { icon: Brain, text: 'Verbinde...', color: 'text-yellow-500' };
      case 'listening':
        return { icon: Mic, text: 'Hört zu...', color: 'text-green-500' };
      case 'transcribing':
        return { icon: Brain, text: 'Transkribiert...', color: 'text-blue-500' };
      case 'analyzing':
        return { icon: Brain, text: 'Analysiert...', color: 'text-purple-500' };
      case 'active':
        return { icon: CheckCircle2, text: 'Aktiv', color: 'text-green-500' };
      default:
        return { icon: MicOff, text: 'Unbekannt', color: 'text-muted-foreground' };
    }
  };

  const statusDisplay = getStatusDisplay();
  const StatusIcon = statusDisplay.icon;

  return (
    <Card className="h-full flex flex-col border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Brain className="h-5 w-5 text-primary" />
          KI-Trainer
        </CardTitle>
        <div className="flex items-center gap-2">
          <StatusIcon className={`h-4 w-4 ${statusDisplay.color} ${status === 'listening' || status === 'analyzing' ? 'animate-pulse' : ''}`} />
          <span className={`text-sm ${statusDisplay.color}`}>{statusDisplay.text}</span>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-hidden">
        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {objections.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Lightbulb className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground">
              {isActive 
                ? 'Warte auf erkannte Einwände...' 
                : 'Starte einen Call, um den KI-Trainer zu aktivieren'}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              Der KI-Trainer erkennt automatisch Einwände und schlägt Antworten vor
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100%-1rem)]">
            <div className="space-y-4">
              {objections.map((obj, index) => (
                <div 
                  key={index} 
                  className="p-4 bg-muted/50 rounded-lg border border-border animate-in fade-in slide-in-from-top-2 duration-300"
                >
                  <div className="flex items-start gap-2 mb-2">
                    <Badge variant="outline" className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                      Einwand erkannt
                    </Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(obj.timestamp).toLocaleTimeString('de-DE')}
                    </span>
                  </div>
                  
                  <p className="text-sm text-foreground/80 mb-3 italic">
                    "{obj.objection}"
                  </p>
                  
                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-primary">Vorgeschlagene Antwort:</span>
                    </div>
                    <p className="text-sm text-foreground">
                      {obj.response}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default AITrainerPanel;
