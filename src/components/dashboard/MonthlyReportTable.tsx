import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { exportToCSV, exportToPDF, type ReportData } from "@/lib/exportReport";

interface Props {
  tenantId: string;
  companyName: string;
}

const MONTHS_DE = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

const KPI_COLUMNS = [
  { key: "period_date", label: "Datum", format: "date" },
  { key: "post_type", label: "Posttyp", format: "text" },
  { key: "impressions", label: "Impressionen", format: "number" },
  { key: "impressions_delta", label: "Δ Impr.", format: "delta" },
  { key: "likes", label: "Likes", format: "number" },
  { key: "comments", label: "Kommentare", format: "number" },
  { key: "link_clicks", label: "Link-Klicks", format: "number" },
  { key: "followers_current", label: "Follower", format: "number" },
  { key: "impressions", label: "Impressionen", format: "number" },
  { key: "comments", label: "Kommentare", format: "number" },
  { key: "dms_sent", label: "DMs gesendet", format: "number" },
  { key: "leads_total", label: "Leads", format: "number" },
  { key: "leads_qualified", label: "MQL", format: "number" },
  { key: "lead_quality_rate", label: "MQL-Quote %", format: "percent" },
  { key: "calls_made", label: "Anwahlen", format: "number" },
  { key: "calls_reached", label: "Erreicht", format: "number" },
  { key: "calls_interested", label: "Interessiert", format: "number" },
  { key: "reach_rate", label: "Erreich. %", format: "percent" },
  { key: "interest_rate", label: "Interesse %", format: "percent" },
  { key: "appointments", label: "Termine", format: "number" },
  { key: "settings_planned", label: "Sett. gepl.", format: "number" },
  { key: "settings_held", label: "Sett. geh.", format: "number" },
  { key: "setting_show_rate", label: "Sett. Show %", format: "percent" },
  { key: "closings_planned", label: "Clos. gepl.", format: "number" },
  { key: "closings_held", label: "Clos. geh.", format: "number" },
  { key: "closing_show_rate", label: "Clos. Show %", format: "percent" },
  { key: "deals", label: "Deals", format: "number" },
  { key: "closing_rate", label: "Closing %", format: "percent" },
  { key: "cash_collected", label: "Cash €", format: "currency" },
  { key: "deal_volume", label: "Deal-Vol. €", format: "currency" },
  { key: "revenue_per_lead", label: "€/Lead", format: "currency" },
  { key: "cost_per_lead", label: "Kosten/Lead €", format: "currency" },
];

function formatCell(value: any, format: string): string {
  if (value == null || value === "") return "–";
  const num = parseFloat(value);
  switch (format) {
    case "date":
      return new Date(value).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
    case "number":
      return isNaN(num) ? String(value) : num.toLocaleString("de-DE");
    case "currency":
      return isNaN(num) ? "–" : `${num.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    case "percent":
      return isNaN(num) ? "–" : `${num.toFixed(1)}%`;
    case "delta":
      if (isNaN(num)) return "–";
      return num > 0 ? `+${num.toLocaleString("de-DE")}` : num.toLocaleString("de-DE");
    case "text":
      return value === "lead" ? "🎯 Lead" : value === "content" ? "📝 Content" : String(value);
    default:
      return String(value);
  }
}

export function MonthlyReportTable({ tenantId, companyName }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    loadMonthData();
  }, [tenantId, year, month]);

  const loadMonthData = async () => {
    setLoading(true);
    const startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

    const { data: dailyData } = await supabase
      .from("v_metrics_daily" as any)
      .select("*")
      .eq("tenant_id", tenantId)
      .gte("period_date", startDate)
      .lte("period_date", endDate)
      .order("period_date", { ascending: true });

    setData(dailyData || []);

    // Compute summary row
    if (dailyData && dailyData.length > 0) {
      const sum = (field: string) => dailyData.reduce((s: number, r: any) => s + (parseFloat(r[field]) || 0), 0);
      const avg = (field: string) => {
        const vals = dailyData.filter((r: any) => r[field] != null && parseFloat(r[field]) > 0);
        return vals.length > 0 ? vals.reduce((s: number, r: any) => s + parseFloat(r[field]), 0) / vals.length : 0;
      };
      setSummary({
        leads_total: sum("leads_total"),
        leads_qualified: sum("leads_qualified"),
        appointments: sum("appointments"),
        settings_planned: sum("settings_planned"),
        settings_held: sum("settings_held"),
        closings: sum("closings"),
        deals: sum("deals"),
        cash_collected: sum("cash_collected"),
        deal_volume: sum("deal_volume"),
        show_up_rate: avg("show_up_rate"),
        closing_rate: avg("closing_rate"),
        revenue_per_lead: avg("revenue_per_lead"),
        cost_per_lead: avg("cost_per_lead"),
        impressions: Math.max(...dailyData.map((r: any) => parseFloat(r.impressions) || 0)),
        likes: Math.max(...dailyData.map((r: any) => parseFloat(r.likes) || 0)),
        comments: Math.max(...dailyData.map((r: any) => parseFloat(r.comments) || 0)),
        link_clicks: sum("link_clicks"),
        followers_current: Math.max(...dailyData.map((r: any) => parseFloat(r.followers_current) || 0)),
        days_tracked: dailyData.length,
      });
    } else {
      setSummary(null);
    }
    setLoading(false);
  };

  const navigateMonth = (dir: -1 | 1) => {
    let newMonth = month + dir;
    let newYear = year;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setMonth(newMonth);
    setYear(newYear);
  };

  const handleExportCSV = () => {
    const reportData: ReportData = {
      title: `KPI Report – ${MONTHS_DE[month]} ${year}`,
      company: companyName,
      period: `${MONTHS_DE[month]} ${year}`,
      columns: KPI_COLUMNS,
      rows: data,
      summary,
    };
    exportToCSV(reportData);
  };

  const handleExportPDF = () => {
    const reportData: ReportData = {
      title: `KPI Report – ${MONTHS_DE[month]} ${year}`,
      company: companyName,
      period: `${MONTHS_DE[month]} ${year}`,
      columns: KPI_COLUMNS,
      rows: data,
      summary,
    };
    exportToPDF(reportData);
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Monatsreport
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS_DE.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="border-l pl-2 flex gap-1">
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={data.length === 0}>
                <Download className="h-3.5 w-3.5 mr-1" /> CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={data.length === 0}>
                <Download className="h-3.5 w-3.5 mr-1" /> PDF
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Daten werden geladen...</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Keine Daten für {MONTHS_DE[month]} {year} vorhanden.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <div className="min-w-[1200px] px-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    {KPI_COLUMNS.map((col) => (
                      <TableHead key={col.key} className="text-xs whitespace-nowrap px-2">
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row, i) => (
                    <TableRow key={i}>
                      {KPI_COLUMNS.map((col) => (
                        <TableCell key={col.key} className="text-xs px-2 py-1.5 whitespace-nowrap">
                          {formatCell(row[col.key], col.format)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                  {/* Summary row */}
                  {summary && (
                    <TableRow className="bg-muted/50 font-semibold border-t-2">
                      <TableCell className="text-xs px-2 py-2">
                        Σ {summary.days_tracked} Tage
                      </TableCell>
                      <TableCell className="text-xs px-2 py-2">–</TableCell>
                      {KPI_COLUMNS.slice(2).map((col) => (
                        <TableCell key={col.key} className="text-xs px-2 py-2 whitespace-nowrap">
                          {formatCell(summary[col.key], col.format)}
                        </TableCell>
                      ))}
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
