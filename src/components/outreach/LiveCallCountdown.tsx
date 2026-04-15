import { useLiveCallCountdown } from "@/hooks/useLiveCallCountdown";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { de } from "date-fns/locale";

interface LiveCallCountdownProps {
  className?: string;
}

export function LiveCallCountdown({ className }: LiveCallCountdownProps) {
  const { days, hours, minutes, seconds, isLive, nextCallDate } = useLiveCallCountdown();

  if (isLive) {
    return (
      <div className={`bg-destructive/10 border border-destructive/30 rounded-xl p-4 ${className}`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
          </span>
          <span className="font-bold text-destructive text-lg">JETZT LIVE!</span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          Der Weekly Outreach Call läuft gerade – tritt jetzt bei!
        </p>
      </div>
    );
  }

  const formattedDate = format(nextCallDate, "EEEE, d. MMMM", { locale: de });

  return (
    <div className={`bg-muted/50 rounded-xl p-4 ${className}`}>
      <div className="text-center mb-3">
        <Badge variant="outline" className="mb-2">Nächster Call</Badge>
        <p className="text-sm text-muted-foreground">{formattedDate} um 17:00 Uhr</p>
      </div>
      
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-background rounded-lg p-2 border">
          <div className="text-2xl font-bold text-foreground">{days}</div>
          <div className="text-xs text-muted-foreground">Tage</div>
        </div>
        <div className="bg-background rounded-lg p-2 border">
          <div className="text-2xl font-bold text-foreground">{hours}</div>
          <div className="text-xs text-muted-foreground">Std</div>
        </div>
        <div className="bg-background rounded-lg p-2 border">
          <div className="text-2xl font-bold text-foreground">{minutes}</div>
          <div className="text-xs text-muted-foreground">Min</div>
        </div>
        <div className="bg-background rounded-lg p-2 border">
          <div className="text-2xl font-bold text-foreground">{seconds}</div>
          <div className="text-xs text-muted-foreground">Sek</div>
        </div>
      </div>
    </div>
  );
}
