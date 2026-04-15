import { useState } from "react";
import { Phone, PhoneCall, PhoneOff, Calendar, HelpCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Call types
const CALL_TYPES = [
  { value: 'opening', label: 'Opening Call', icon: Phone },
  { value: 'setting', label: 'Setting Call', icon: Calendar },
  { value: 'closing', label: 'Closing Call', icon: PhoneCall },
  { value: 'other', label: 'Sonstiges', icon: HelpCircle },
] as const;

// Outcomes per call type
const CALL_OUTCOMES_BY_TYPE: Record<string, string[]> = {
  opening: [
    'Nicht erreicht',
    '2× nicht erreicht', 
    '3× nicht erreicht',
    'Entscheider nicht erreichbar',
    'Im Urlaub',
    'Kein Interesse',
    'Kein Bedarf',
    'Setting terminiert',
    'Rückruf vereinbart',
  ],
  setting: [
    'Setting No Show',
    'Setting Follow Up',
    'Setting erfolgreich - Closing terminiert',
    'Kein Interesse nach Setting',
    'Rückruf vereinbart',
  ],
  closing: [
    'Closing No Show',
    'Closing Follow Up', 
    'Abgeschlossen - Gewonnen',
    'Abgeschlossen - Verloren',
    'Rückruf vereinbart',
  ],
  other: [
    'Allgemeine Rückfrage',
    'Support-Anfrage',
    'Weiterleitung',
    'Sonstiges',
  ],
};

interface CallActivityLoggerProps {
  contactId: string;
  dealId: string;
  currentStage: string;
  onActivityLogged: () => void;
  onStageUpdate?: (newStage: string) => void;
}

export default function CallActivityLogger({ 
  contactId, 
  dealId, 
  currentStage,
  onActivityLogged,
  onStageUpdate 
}: CallActivityLoggerProps) {
  const [callType, setCallType] = useState<string>("");
  const [outcome, setOutcome] = useState<string>("");
  const [note, setNote] = useState("");
  const [isLogging, setIsLogging] = useState(false);

  const availableOutcomes = callType ? CALL_OUTCOMES_BY_TYPE[callType] || [] : [];

  const getStageFromOutcome = (outcome: string): string | null => {
    // Map outcomes to pipeline stages
    if (outcome === 'Setting terminiert') return 'Setting';
    if (outcome === 'Setting erfolgreich - Closing terminiert') return 'Closing';
    if (outcome === 'Abgeschlossen - Gewonnen') return 'Abgeschlossen';
    if (outcome === 'Abgeschlossen - Verloren' || outcome === 'Kein Interesse' || outcome === 'Kein Bedarf' || outcome === 'Kein Interesse nach Setting') return 'Verloren';
    return null; // Don't change stage for other outcomes
  };

  const handleLogActivity = async () => {
    if (!callType || !outcome) {
      toast.error("Bitte Anruftyp und Ergebnis auswählen");
      return;
    }

    setIsLogging(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Nicht angemeldet");

      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('id', user.id)
        .single();

      // Log the call activity
      const activityNote = `[${CALL_TYPES.find(t => t.value === callType)?.label}] ${outcome}${note ? ` - ${note}` : ''}`;
      
      const { error: activityError } = await supabase
        .from('activities')
        .insert({
          contact_id: contactId,
          user_id: user.id,
          account_id: profile?.account_id,
          type: 'call',
          note: activityNote,
        });

      if (activityError) throw activityError;

      // Check if we need to update the deal stage
      const newStage = getStageFromOutcome(outcome);
      if (newStage && newStage !== currentStage) {
        const { error: dealError } = await supabase
          .from('deals')
          .update({ stage: newStage as any })
          .eq('id', dealId);

        if (dealError) throw dealError;
        
        toast.success(`Aktivität geloggt & Status auf "${newStage}" geändert`);
        onStageUpdate?.(newStage);
      } else {
        toast.success("Call-Aktivität geloggt");
      }

      // Reset form
      setCallType("");
      setOutcome("");
      setNote("");
      
      onActivityLogged();
    } catch (error) {
      console.error('Error logging activity:', error);
      toast.error("Fehler beim Speichern der Aktivität");
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Call-Aktivität loggen</h3>
      
      {/* Call Type Selection */}
      <div className="grid grid-cols-4 gap-2">
        {CALL_TYPES.map((type) => {
          const Icon = type.icon;
          return (
            <Button
              key={type.value}
              variant={callType === type.value ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setCallType(type.value);
                setOutcome(""); // Reset outcome when type changes
              }}
              className="flex flex-col items-center gap-1 h-auto py-3"
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px]">{type.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Outcome Selection */}
      {callType && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Ergebnis</Label>
          <Select value={outcome} onValueChange={setOutcome}>
            <SelectTrigger className="bg-white/[0.02] border-white/10">
              <SelectValue placeholder="Ergebnis auswählen..." />
            </SelectTrigger>
            <SelectContent>
              {availableOutcomes.map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Optional Note */}
      {outcome && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Notiz (optional)</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Zusätzliche Notizen zum Anruf..."
            rows={2}
            className="bg-white/[0.02] border-white/5"
          />
        </div>
      )}

      {/* Submit Button */}
      <Button 
        onClick={handleLogActivity} 
        className="w-full" 
        disabled={!callType || !outcome || isLogging}
      >
        {isLogging ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Speichern...
          </>
        ) : (
          <>
            <Phone className="w-4 h-4 mr-2" />
            Aktivität loggen
          </>
        )}
      </Button>
    </div>
  );
}
