import { useLiveCallCountdown } from "@/hooks/useLiveCallCountdown";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { Video, ExternalLink, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ZOOM_LINK = "https://us06web.zoom.us/j/84439071732?pwd=b1gqdFZ9eZuk5zmJIrLIpyWAxJGKux.1";

interface DashboardLiveCallWidgetProps {
  className?: string;
}

export function DashboardLiveCallWidget({ className }: DashboardLiveCallWidgetProps) {
  const { days, hours, minutes, seconds, isLive, nextCallDate } = useLiveCallCountdown();
  const navigate = useNavigate();

  const formattedDate = format(nextCallDate, "EEEE, d. MMM", { locale: de });

  if (isLive) {
    return (
      <div className={`glass-card overflow-hidden ${className}`}>
        <div className="bg-gradient-to-r from-red-500/20 via-red-500/10 to-orange-500/10 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-10 w-10 rounded-xl bg-red-500 flex items-center justify-center">
                  <Video className="h-5 w-5 text-white" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              </div>
              <div>
                <p className="font-bold text-red-400">JETZT LIVE!</p>
                <p className="text-xs text-muted-foreground">Weekly Outreach Call</p>
              </div>
            </div>
            <Button 
              size="sm" 
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => window.open(ZOOM_LINK, '_blank')}
            >
              Beitreten
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`glass-card overflow-hidden ${className}`}>
      <div className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-blue-500/10 p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <Video className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm">Nächster Live-Call</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formattedDate}, 17:00 Uhr
              </p>
            </div>
          </div>

          {/* Compact Countdown */}
          <div className="flex items-center gap-1.5">
            <div className="bg-background/80 rounded-lg px-2 py-1 text-center min-w-[36px]">
              <span className="text-lg font-bold text-foreground">{days}</span>
              <span className="text-[9px] text-muted-foreground block -mt-1">T</span>
            </div>
            <span className="text-muted-foreground">:</span>
            <div className="bg-background/80 rounded-lg px-2 py-1 text-center min-w-[36px]">
              <span className="text-lg font-bold text-foreground">{hours}</span>
              <span className="text-[9px] text-muted-foreground block -mt-1">Std</span>
            </div>
            <span className="text-muted-foreground">:</span>
            <div className="bg-background/80 rounded-lg px-2 py-1 text-center min-w-[36px]">
              <span className="text-lg font-bold text-foreground">{minutes}</span>
              <span className="text-[9px] text-muted-foreground block -mt-1">Min</span>
            </div>
            <span className="text-muted-foreground hidden sm:inline">:</span>
            <div className="bg-background/80 rounded-lg px-2 py-1 text-center min-w-[36px] hidden sm:block">
              <span className="text-lg font-bold text-foreground">{seconds}</span>
              <span className="text-[9px] text-muted-foreground block -mt-1">Sek</span>
            </div>
          </div>

          <Button 
            size="sm" 
            variant="outline"
            className="hidden md:flex"
            onClick={() => navigate("/training")}
          >
            Alle Calls
          </Button>
        </div>
      </div>
    </div>
  );
}
