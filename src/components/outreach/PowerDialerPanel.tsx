import { useEffect, useState } from "react";
import { Phone, UserX, Users, Target, Ban, Calendar, CheckCircle, Clock, Radio, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildDialHref, getDialerName } from "@/lib/dialerAdapter";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import RealtimeCall from "@/components/outreach/RealtimeCall";
import CallHistory from "@/components/outreach/CallHistory";

type Contact = {
  id: string;
  first_name: string;
  last_name?: string;
  phone: string;
  company?: string;
  stage?: string;
  email?: string;
};

type Deal = {
  id: string;
  contact_id: string;
  title: string;
};

export default function PowerDialerPanel() {
  const [current, setCurrent] = useState<Contact | null>(null);
  const [currentDeal, setCurrentDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [useWebRTC, setUseWebRTC] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  async function loadNext() {
    setLoading(true);
    setCallStartTime(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('power-dialer-next');
      
      if (error) throw error;
      
      setCurrent(data || null);
      
      // Load deal for this contact
      if (data) {
        const { data: dealData } = await supabase
          .from('deals')
          .select('id, contact_id, title')
          .eq('contact_id', data.id)
          .single();
        
        setCurrentDeal(dealData);
      } else {
        setCurrentDeal(null);
        toast.success("🎉 Keine weiteren Leads in der Queue!");
      }
    } catch (error: any) {
      console.error('Error loading next lead:', error);
      toast.error(`Fehler: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNext();
  }, []);

  async function logAndNext(payload: { outcome: string; new_stage?: string; message?: string }) {
    if (!current) return;
    
    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('power-dialer-log', {
        body: {
          contact_id: current.id,
          outcome: payload.outcome,
          new_stage: payload.new_stage,
          message: payload.message,
        }
      });
      
      if (error) throw error;
      
      setCurrent(data?.next || null);
      setCallStartTime(null);
      
      toast.success(`✓ Call geloggt${payload.new_stage ? ` → ${payload.new_stage}` : ''}`);
      
      if (!data?.next) {
        toast.success("🎉 Keine weiteren Leads in der Queue!");
      }
    } catch (error: any) {
      console.error('Error logging call:', error);
      toast.error(`Fehler: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const handleCallClick = () => {
    setCallStartTime(new Date());
    toast.info(`📞 Rufe an: ${current?.phone}`);
  };

  const handleWebRTCCall = () => {
    setIsInCall(true);
    setCallStartTime(new Date());
  };

  const handleCallEnd = () => {
    setIsInCall(false);
    setCallStartTime(null);
  };

  if (loading && !current) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Lade nächsten Lead…</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!current) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 space-y-4">
            <CheckCircle className="h-16 w-16 mx-auto text-success" />
            <div>
              <h3 className="text-lg font-semibold">Keine Leads mehr in der Queue! 🎉</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Alle verfügbaren Kontakte wurden bearbeitet.
              </p>
            </div>
            <Button onClick={loadNext} variant="outline">
              Erneut prüfen
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dialHref = buildDialHref(current.phone);

  // Show WebRTC call interface if in call
  if (isInCall && useWebRTC && current) {
    return (
      <>
        <RealtimeCall 
          contactName={`${current.first_name} ${current.last_name || ""}`}
          contactId={current.id}
          dealId={currentDeal?.id}
          onCallEnd={handleCallEnd}
        />
        {currentDeal && (
          <div className="mt-4">
            <CallHistory dealId={currentDeal.id} />
          </div>
        )}
      </>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-2xl">
              {current.first_name} {current.last_name || ""}
            </CardTitle>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {current.company && (
                <span className="text-sm text-muted-foreground">
                  {current.company}
                </span>
              )}
              {current.stage && (
                <Badge variant="outline">{current.stage}</Badge>
              )}
            </div>
          </div>
          <div className="ml-4 flex gap-2">
            <Button
              size="lg"
              onClick={handleWebRTCCall}
              variant={useWebRTC ? "default" : "outline"}
              className={useWebRTC ? "bg-success hover:bg-success/90" : ""}
            >
              <Radio className="mr-2 h-5 w-5" />
              WebRTC Call
            </Button>
            <Button
              size="lg"
              onClick={handleCallClick}
              asChild
              variant={!useWebRTC ? "default" : "outline"}
            >
              <a href={dialHref}>
                <Phone className="mr-2 h-5 w-5" />
                {getDialerName()}
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Telefon:</span>
            <div className="font-medium">{current.phone}</div>
          </div>
          {current.email && (
            <div>
              <span className="text-muted-foreground">E-Mail:</span>
              <div className="font-medium">{current.email}</div>
            </div>
          )}
        </div>

        {callStartTime && (
          <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm">Call läuft seit {Math.floor((Date.now() - callStartTime.getTime()) / 1000)}s</span>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold mb-3">Call-Outcome:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => logAndNext({
                outcome: "no_answer",
                new_stage: current.stage === "Lead" ? "1× nicht erreicht" : 
                          current.stage === "1× nicht erreicht" ? "2× nicht erreicht" :
                          current.stage === "2× nicht erreicht" ? "3× nicht erreicht" : undefined
              })}
            >
              <UserX className="mr-2 h-4 w-4" />
              Nicht erreicht
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => logAndNext({
                outcome: "gatekeeper",
                message: "Gatekeeper erreicht"
              })}
            >
              <Users className="mr-2 h-4 w-4" />
              Gatekeeper
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => logAndNext({
                outcome: "decision_maker",
                message: "Entscheider erreicht"
              })}
            >
              <Target className="mr-2 h-4 w-4" />
              Entscheider
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => logAndNext({
                outcome: "interested",
                new_stage: "Termin gelegt",
                message: "Termin vereinbart"
              })}
              className="bg-success/10 hover:bg-success/20 border-success/50"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Termin gelegt
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => logAndNext({
                outcome: "not_interested",
                new_stage: "Kein Interesse / Kein Bedarf"
              })}
              className="bg-danger/10 hover:bg-danger/20 border-danger/50"
            >
              <Ban className="mr-2 h-4 w-4" />
              Kein Interesse
            </Button>

            <Button
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => logAndNext({
                outcome: "callback",
                message: "Rückruf vereinbart"
              })}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Rückruf
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-4">
          Nach dem Call einen Outcome wählen → Activity wird geloggt und nächster Lead automatisch geladen.
        </div>

        {/* Call History */}
        {currentDeal && (
          <div className="border-t pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="mb-3"
            >
              <History className="mr-2 h-4 w-4" />
              {showHistory ? 'History ausblenden' : 'Call-History anzeigen'}
            </Button>
            {showHistory && <CallHistory dealId={currentDeal.id} />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
