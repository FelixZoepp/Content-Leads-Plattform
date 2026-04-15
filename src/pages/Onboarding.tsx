import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ProfileSetup from "@/components/onboarding/ProfileSetup";

export default function Onboarding() {
  const navigate = useNavigate();

  const handleProfileComplete = () => {
    navigate("/generating");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-xl">Willkommen bei Cashflow OS</CardTitle>
          <CardDescription>
            Erstelle dein Firmenprofil – basierend auf deinen Daten erstellen wir eine individuelle Erstanalyse mit konkreten Handlungsempfehlungen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileSetup onComplete={handleProfileComplete} />
        </CardContent>
      </Card>
    </div>
  );
}
