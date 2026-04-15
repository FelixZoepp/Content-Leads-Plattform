import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, TrendingUp, MessageSquare, Sparkles, ExternalLink } from "lucide-react";

interface CoachingCall {
  day: number; // 0 = Monday, 1 = Tuesday, etc.
  dayName: string;
  time: string;
  hour: number;
  title: string;
  shortTitle: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  zoomLink?: string;
}

const coachingCalls: CoachingCall[] = [
  {
    day: 0,
    dayName: "Montag",
    time: "17:00",
    hour: 17,
    title: "Leadgenerierungs-Call",
    shortTitle: "Leads",
    description: "Strategien zur Kundengewinnung",
    icon: <Users className="h-4 w-4" />,
    gradient: "from-blue-500 to-cyan-400",
  },
  {
    day: 2,
    dayName: "Mittwoch",
    time: "17:00",
    hour: 17,
    title: "Weekly Outreach Call",
    shortTitle: "Outreach",
    description: "Q&A & Best Practices",
    icon: <MessageSquare className="h-4 w-4" />,
    gradient: "from-violet-500 to-purple-400",
    zoomLink: "https://us06web.zoom.us/j/84439071732?pwd=b1gqdFZ9eZuk5zmJIrLIpyWAxJGKux.1",
  },
  {
    day: 3,
    dayName: "Donnerstag",
    time: "09:00",
    hour: 9,
    title: "Vertriebscall",
    shortTitle: "Sales",
    description: "Abschluss-Techniken",
    icon: <TrendingUp className="h-4 w-4" />,
    gradient: "from-amber-500 to-orange-400",
  },
];

const weekDays = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const fullWeekDays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export function CoachingCalendar() {
  const getCallForDay = (dayIndex: number) => {
    return coachingCalls.find(call => call.day === dayIndex);
  };

  return (
    <Card className="overflow-hidden border-2">
      <CardHeader className="bg-gradient-to-r from-primary/10 via-purple-500/10 to-amber-500/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-purple-500 text-white">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-xl">Coaching-Kalender</CardTitle>
              <p className="text-sm text-muted-foreground">Deine wöchentlichen Live-Sessions</p>
            </div>
          </div>
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
            <Sparkles className="h-3 w-3 mr-1" />
            Starter Masterclass
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Week Grid Header */}
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {weekDays.map((day, index) => {
            const call = getCallForDay(index);
            return (
              <div
                key={day}
                className={`py-3 text-center border-r last:border-r-0 ${
                  call ? "font-semibold text-foreground" : "text-muted-foreground"
                }`}
              >
                <span className="hidden sm:inline">{fullWeekDays[index]}</span>
                <span className="sm:hidden">{day}</span>
              </div>
            );
          })}
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 min-h-[200px]">
          {weekDays.map((_, index) => {
            const call = getCallForDay(index);
            return (
              <div
                key={index}
                className={`border-r last:border-r-0 p-2 ${
                  call ? "bg-gradient-to-b from-muted/20 to-transparent" : ""
                }`}
              >
                {call && (
                  <div
                    className={`h-full rounded-xl bg-gradient-to-br ${call.gradient} p-3 text-white shadow-lg transform transition-all hover:scale-[1.02] hover:shadow-xl cursor-pointer group`}
                    onClick={() => call.zoomLink && window.open(call.zoomLink, '_blank')}
                  >
                    <div className="flex flex-col h-full">
                      {/* Time Badge */}
                      <div className="flex items-center gap-1 text-white/90 text-xs font-medium mb-2">
                        <Clock className="h-3 w-3" />
                        <span>{call.time} Uhr</span>
                      </div>
                      
                      {/* Icon */}
                      <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 w-fit mb-2">
                        {call.icon}
                      </div>
                      
                      {/* Title */}
                      <h4 className="font-bold text-sm leading-tight mb-1">
                        <span className="hidden lg:inline">{call.title}</span>
                        <span className="lg:hidden">{call.shortTitle}</span>
                      </h4>
                      
                      {/* Description - hidden on mobile */}
                      <p className="text-xs text-white/80 hidden md:block flex-1">
                        {call.description}
                      </p>

                      {/* Join indicator */}
                      {call.zoomLink && (
                        <div className="mt-2 flex items-center gap-1 text-xs text-white/90 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="h-3 w-3" />
                          <span>Beitreten</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend / Info Section */}
        <div className="border-t bg-muted/20 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              {coachingCalls.map((call) => (
                <div key={call.day} className="flex items-center gap-2 text-sm">
                  <div className={`h-3 w-3 rounded-full bg-gradient-to-r ${call.gradient}`} />
                  <span className="text-muted-foreground">{call.shortTitle}</span>
                  <span className="text-xs text-muted-foreground/70">({call.time})</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              3 Live-Calls pro Woche • Exklusiv für Starter Masterclass
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
