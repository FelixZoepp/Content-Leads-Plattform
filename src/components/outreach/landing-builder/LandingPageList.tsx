import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe, Trash2, Eye, FileText, Calendar } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface LandingPage {
  id: string;
  name: string;
  slug: string;
  status: string;
  view_count: number;
  created_at: string;
  updated_at: string;
}

interface LandingPageListProps {
  pages: LandingPage[];
  selectedPage: LandingPage | null;
  onSelect: (page: LandingPage) => void;
  onDelete: (pageId: string) => void;
}

export const LandingPageList = ({ pages, selectedPage, onSelect, onDelete }: LandingPageListProps) => {
  return (
    <Card className="glass-card border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Meine Landing Pages
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-300px)]">
          {pages.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Noch keine Landing Pages erstellt
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {pages.map((page) => (
                <div
                  key={page.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedPage?.id === page.id
                      ? "bg-primary/20 border border-primary/30"
                      : "hover:bg-white/5"
                  }`}
                  onClick={() => onSelect(page)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{page.name}</h4>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        /lp/{page.slug}
                      </p>
                    </div>
                    <Badge
                      variant={page.status === 'published' ? 'default' : 'secondary'}
                      className="text-[10px] ml-2 shrink-0"
                    >
                      {page.status === 'published' ? (
                        <Globe className="w-3 h-3 mr-1" />
                      ) : null}
                      {page.status === 'published' ? 'Live' : 'Entwurf'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {page.view_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(page.updated_at), { addSuffix: true, locale: de })}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(page.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
