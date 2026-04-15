import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface EmptyDashboardProps {
  onRefresh?: () => void;
  hasSheet: boolean;
}

export const EmptyDashboard = ({ onRefresh, hasSheet }: EmptyDashboardProps) => {
  const navigate = useNavigate();

  if (!hasSheet) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Kein Tracking-Sheet verbunden</CardTitle>
            <CardDescription>
              Verbinde dein Google-Sheet, um deine Performance-Daten zu sehen.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/onboarding")}>
              Sheet verbinden
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Noch keine Daten vorhanden</CardTitle>
          <CardDescription>
            Dein Sheet ist verbunden, aber noch keine Daten synchronisiert.
            Klicke auf "Aktualisieren", um deine Daten zu laden.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Jetzt synchronisieren
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};