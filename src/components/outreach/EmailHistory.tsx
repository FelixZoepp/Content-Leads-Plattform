import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Mail, Eye, MousePointer } from "lucide-react";

interface EmailHistoryProps {
  contactId: string;
}

interface EmailLog {
  id: string;
  subject: string;
  from_email: string;
  to_email: string;
  status: string;
  open_count: number;
  click_count: number;
  opened_at: string | null;
  created_at: string;
}

export default function EmailHistory({ contactId }: EmailHistoryProps) {
  const { data: emails, isLoading } = useQuery({
    queryKey: ["email-history", contactId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EmailLog[];
    },
  });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Laden...</div>;
  }

  if (!emails?.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Mail className="h-4 w-4" />
          E-Mail Verlauf
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {emails.map((email) => (
          <div
            key={email.id}
            className="border rounded-lg p-3 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-sm line-clamp-1">{email.subject}</p>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(email.created_at), {
                  addSuffix: true,
                  locale: de,
                })}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={email.status === "sent" ? "default" : "secondary"}>
                {email.status === "sent" ? "Gesendet" : email.status}
              </Badge>
              {email.open_count > 0 && (
                <Badge variant="outline" className="gap-1">
                  <Eye className="h-3 w-3" />
                  {email.open_count}x geöffnet
                </Badge>
              )}
              {email.click_count > 0 && (
                <Badge variant="outline" className="gap-1">
                  <MousePointer className="h-3 w-3" />
                  {email.click_count}x geklickt
                </Badge>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
