import { useState, useRef, useMemo } from "react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { FinancialTracker } from "@/components/dashboard/FinancialTracker";
import { FinanceCharts } from "@/components/client/FinanceCharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, PlusCircle, Upload, FileText, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";

interface Transaction {
  date: string;
  description: string;
  amount: number;
  category: string;
}

function categorize(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes("gehalt") || d.includes("lohn") || d.includes("salary")) return "Personal";
  if (d.includes("miete") || d.includes("büro") || d.includes("office")) return "Miete & Büro";
  if (d.includes("werbung") || d.includes("ads") || d.includes("meta") || d.includes("google") || d.includes("linkedin")) return "Marketing & Ads";
  if (d.includes("software") || d.includes("saas") || d.includes("tool") || d.includes("abo")) return "Software & Tools";
  if (d.includes("steuer") || d.includes("finanzamt") || d.includes("ust")) return "Steuern";
  if (d.includes("versicherung")) return "Versicherungen";
  if (d.includes("telefon") || d.includes("internet") || d.includes("handy")) return "Kommunikation";
  return "Sonstiges";
}

function parseCSV(text: string): Transaction[] {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];

  const header = lines[0].toLowerCase();
  const sep = header.includes(";") ? ";" : ",";
  const headers = lines[0].split(sep).map(h => h.trim().replace(/"/g, "").toLowerCase());

  const dateIdx = headers.findIndex(h => h.includes("datum") || h.includes("date") || h.includes("buchungstag") || h.includes("valuta"));
  const descIdx = headers.findIndex(h => h.includes("verwendungszweck") || h.includes("beschreibung") || h.includes("empfänger") || h.includes("auftraggeber") || h.includes("text") || h.includes("description") || h.includes("name"));
  const amountIdx = headers.findIndex(h => h.includes("betrag") || h.includes("amount") || h.includes("umsatz") || h.includes("soll") || h.includes("haben"));

  if (dateIdx === -1 || amountIdx === -1) return [];

  return lines.slice(1).map(line => {
    const cols = line.split(sep).map(c => c.trim().replace(/"/g, ""));
    const amountStr = cols[amountIdx]?.replace(/\./g, "").replace(",", ".") || "0";
    const amount = parseFloat(amountStr) || 0;
    const description = cols[descIdx] || cols[Math.max(0, descIdx)] || "";

    return {
      date: cols[dateIdx] || "",
      description,
      amount,
      category: categorize(description),
    };
  }).filter(t => t.amount !== 0);
}

export default function FinancePage() {
  const { tenantId } = useDashboardData();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setTransactions(parsed);
    };
    reader.readAsText(file, "utf-8");
  };

  const income = useMemo(() => transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0), [transactions]);
  const expenses = useMemo(() => transactions.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0), [transactions]);
  const profit = income - expenses;

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    transactions.filter(t => t.amount < 0).forEach(t => {
      map[t.category] = (map[t.category] || 0) + Math.abs(t.amount);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [transactions]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="glass-panel fade-up">
        <div className="relative z-[2]">
          <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Finanzen</span>
          <h2 className="text-xl text-white" style={{ fontFamily: "var(--font-serif)" }}>Finanz-Übersicht</h2>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="rounded-xl bg-[rgba(249,249,249,0.04)] border border-[rgba(249,249,249,0.08)]">
          <TabsTrigger value="dashboard" className="rounded-xl gap-2 data-[state=active]:bg-[rgba(197,160,89,0.15)] data-[state=active]:text-[#E9CB8B]">
            <BarChart3 className="h-4 w-4" />
            Live-Dashboard
          </TabsTrigger>
          <TabsTrigger value="entry" className="rounded-xl gap-2 data-[state=active]:bg-[rgba(197,160,89,0.15)] data-[state=active]:text-[#E9CB8B]">
            <PlusCircle className="h-4 w-4" />
            Woche erfassen
          </TabsTrigger>
          <TabsTrigger value="upload" className="rounded-xl gap-2 data-[state=active]:bg-[rgba(197,160,89,0.15)] data-[state=active]:text-[#E9CB8B]">
            <Upload className="h-4 w-4" />
            Bank-Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4 space-y-6">
          <FinanceCharts tenantId={tenantId} />
          <FinancialTracker tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="entry" className="mt-4">
          <FinancialTracker tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="upload" className="mt-4 space-y-4">
          {/* Upload area */}
          <div
            className="glass-panel fade-up cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            <div className="relative z-[2] text-center py-8">
              <input ref={fileRef} type="file" accept=".csv,.CSV" onChange={handleUpload} className="hidden" />
              <div className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{ background: "rgba(197,160,89,0.12)", border: "1px solid rgba(197,160,89,0.25)" }}>
                <Upload className="w-6 h-6 text-[#E9CB8B]" />
              </div>
              <h3 className="text-[15px] text-white font-semibold mb-1" style={{ fontFamily: "var(--font-serif)" }}>
                Bank-Export hochladen
              </h3>
              <p className="text-[12px] text-[rgba(249,249,249,0.4)]">
                CSV-Datei von deiner Bank (Sparkasse, Volksbank, N26, etc.)
              </p>
              {fileName && (
                <div className="flex items-center justify-center gap-2 mt-3 text-[12px] text-[#7FC29B]">
                  <FileText className="w-3.5 h-3.5" /> {fileName} · {transactions.length} Transaktionen
                </div>
              )}
            </div>
          </div>

          {/* Results */}
          {transactions.length > 0 && (
            <>
              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-4">
                <div className="glass-panel fade-up" style={{ animationDelay: "80ms" }}>
                  <div className="relative z-[2]">
                    <TrendingUp className="w-4 h-4 text-[#7FC29B] mb-2" />
                    <div className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
                      € {income.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[9px] text-[rgba(249,249,249,0.4)] tracking-[0.2em] uppercase mt-1">Einnahmen</div>
                  </div>
                </div>
                <div className="glass-panel fade-up" style={{ animationDelay: "140ms" }}>
                  <div className="relative z-[2]">
                    <TrendingDown className="w-4 h-4 text-[#E87467] mb-2" />
                    <div className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)" }}>
                      € {expenses.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[9px] text-[rgba(249,249,249,0.4)] tracking-[0.2em] uppercase mt-1">Ausgaben</div>
                  </div>
                </div>
                <div className="glass-panel fade-up" style={{ animationDelay: "200ms" }}>
                  <div className="relative z-[2]">
                    <BarChart3 className="w-4 h-4 mb-2" style={{ color: profit >= 0 ? "#7FC29B" : "#E87467" }} />
                    <div className="text-2xl text-white" style={{ fontFamily: "var(--font-serif)", color: profit >= 0 ? "#7FC29B" : "#E87467" }}>
                      € {profit.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[9px] text-[rgba(249,249,249,0.4)] tracking-[0.2em] uppercase mt-1">
                      {profit >= 0 ? "Gewinn" : "Verlust"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Waterfall by category */}
              <div className="glass-panel fade-up" style={{ animationDelay: "260ms", padding: 0 }}>
                <div className="relative z-[2]">
                  <div className="px-5 py-4 border-b border-[rgba(249,249,249,0.08)]">
                    <span className="text-[9px] font-bold tracking-[0.3em] uppercase text-[#E9CB8B] block mb-1">Waterfall</span>
                    <h3 className="text-[15px] text-white" style={{ fontFamily: "var(--font-serif)" }}>Ausgaben nach Kategorie</h3>
                  </div>
                  <div className="p-5 space-y-3">
                    {byCategory.map(([cat, amount], i) => {
                      const pct = expenses > 0 ? (amount / expenses) * 100 : 0;
                      return (
                        <div key={cat}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[12px] text-white font-medium">{cat}</span>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-[rgba(249,249,249,0.4)]">{pct.toFixed(1)}%</span>
                              <span className="text-[13px] text-white" style={{ fontFamily: "var(--font-serif)" }}>
                                € {amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          <div className="h-2 bg-[rgba(249,249,249,0.06)] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                background: i === 0 ? "linear-gradient(90deg, #E87467, #C5A059)" : `rgba(197,160,89,${0.7 - i * 0.08})`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Transaction table */}
              <div className="glass-panel fade-up" style={{ animationDelay: "340ms", padding: 0 }}>
                <div className="relative z-[2]">
                  <div className="px-5 py-4 border-b border-[rgba(249,249,249,0.08)] flex items-center justify-between">
                    <h3 className="text-[13px] font-medium text-white">Transaktionen</h3>
                    <span className="text-[10px] text-[rgba(249,249,249,0.3)] tracking-[0.15em] uppercase">{transactions.length} Einträge</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[rgba(249,249,249,0.08)]">
                          <th className="px-5 py-3 text-left text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.3)]">Datum</th>
                          <th className="px-5 py-3 text-left text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.3)]">Beschreibung</th>
                          <th className="px-5 py-3 text-left text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.3)]">Kategorie</th>
                          <th className="px-5 py-3 text-right text-[9px] font-bold tracking-[0.25em] uppercase text-[rgba(249,249,249,0.3)]">Betrag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 100).map((t, i) => (
                          <tr key={i} className="hover:bg-[rgba(249,249,249,0.02)] transition" style={{ borderBottom: "1px solid rgba(249,249,249,0.05)" }}>
                            <td className="px-5 py-2.5 text-[12px] text-[rgba(249,249,249,0.5)]">{t.date}</td>
                            <td className="px-5 py-2.5 text-[12px] text-white truncate max-w-[250px]">{t.description}</td>
                            <td className="px-5 py-2.5">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(197,160,89,0.1)] text-[#E9CB8B]">{t.category}</span>
                            </td>
                            <td className="px-5 py-2.5 text-right text-[13px]" style={{ fontFamily: "var(--font-serif)", color: t.amount >= 0 ? "#7FC29B" : "#E87467" }}>
                              {t.amount >= 0 ? "+" : ""}€ {Math.abs(t.amount).toLocaleString("de-DE", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
