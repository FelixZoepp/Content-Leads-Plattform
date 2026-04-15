import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2, Building2, Linkedin, BarChart3, Target, ChevronRight, ChevronLeft,
  Sparkles, DollarSign, ShoppingBag, HelpCircle, Users, TrendingUp, UserSearch, Package
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import ICPAnalysisStep, { emptyICPClient, type ICPClient } from "@/components/admin/ICPAnalysisStep";

interface ProfileSetupProps {
  onComplete: () => void;
}

const STEPS = [
  { icon: Building2, label: "Firma" },
  { icon: Linkedin, label: "LinkedIn" },
  { icon: Package, label: "Paket & Produkte" },
  { icon: DollarSign, label: "Finanzen" },
  { icon: Users, label: "Kunden" },
  { icon: UserSearch, label: "ICP" },
  { icon: TrendingUp, label: "Vertrieb" },
  { icon: BarChart3, label: "KPIs" },
  { icon: Target, label: "Ziele" },
];

const STORAGE_KEY = "onboarding_form";
const STORAGE_ICP_KEY = "onboarding_icp";
const STORAGE_STEP_KEY = "onboarding_step";
const STORAGE_PRODUCTS_KEY = "onboarding_products";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

interface ProductEntry {
  name: string;
  price: string;
  type: string; // "einmalig" | "retainer"
  retainerMonths: string;
  description: string;
}

const emptyProduct = (): ProductEntry => ({ name: "", price: "", type: "", retainerMonths: "", description: "" });

export default function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const [step, setStep] = useState(() => loadFromStorage(STORAGE_STEP_KEY, 0));
  const [loading, setLoading] = useState(false);
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false);
  const [unknowns, setUnknowns] = useState<Set<string>>(() => {
    const saved = loadFromStorage<string[]>(STORAGE_KEY + "_unknowns", []);
    return new Set(saved);
  });
  const [icpClients, setIcpClients] = useState<ICPClient[]>(() =>
    loadFromStorage(STORAGE_ICP_KEY, Array.from({ length: 10 }, emptyICPClient))
  );
  const [icpShowResults, setIcpShowResults] = useState(false);
  const [productPalette, setProductPalette] = useState<ProductEntry[]>(() =>
    loadFromStorage(STORAGE_PRODUCTS_KEY, [emptyProduct(), emptyProduct(), emptyProduct()])
  );
  const [formData, setFormData] = useState(() => loadFromStorage(STORAGE_KEY, {
    // Step 0: Firma
    companyName: "",
    contactName: "",
    industry: "",
    teamSize: "",
    targetAudience: "",
    websiteUrl: "",
    // Step 1: LinkedIn
    linkedinUrl: "",
    linkedinFollowersCurrent: "",
    postingFrequency: "",
    linkedinExperience: "",
    // Step 2: Standard-Paket
    currentOffer: "",
    offerPrice: "",
    offerType: "",
    retainerMonths: "",
    closingRate: "",
    // Step 3: Finanzen
    revenueRecurring: "",
    revenueOnetime: "",
    adsSpendMonthly: "",
    toolsCostsMonthly: "",
    personnelCostsMonthly: "",
    deliveryCostsMonthly: "",
    otherCostsMonthly: "",
    // Step 4: Kunden
    totalCustomers: "",
    existingCustomers: "",
    newCustomersMonthly: "",
    paymentDefaultRate: "",
    // Step 6: Vertrieb
    commissionRateActual: "",
    commissionRateTarget: "",
    salesGrossSalary: "",
    salesSideCosts: "",
    fulfillmentGrossSalary: "",
    fulfillmentToolCosts: "",
    costPerCustomerFulfillment: "",
    // Step 7: KPIs
    currentLeadsPerMonth: "",
    currentConversionRate: "",
    monthlyBudget: "",
    costPerLead: "",
    costPerAppointment: "",
    // Step 8: Ziele
    goalLeadsMonthly: "",
    goalRevenueMonthly: "",
    goalTimeframe: "",
    primaryGoal: "",
  }));
  const { toast } = useToast();
  const { refreshTenant } = useAuth();

  // Persist to sessionStorage
  useEffect(() => { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData)); }, [formData]);
  useEffect(() => { sessionStorage.setItem(STORAGE_ICP_KEY, JSON.stringify(icpClients)); }, [icpClients]);
  useEffect(() => { sessionStorage.setItem(STORAGE_STEP_KEY, JSON.stringify(step)); }, [step]);
  useEffect(() => { sessionStorage.setItem(STORAGE_KEY + "_unknowns", JSON.stringify([...unknowns])); }, [unknowns]);
  useEffect(() => { sessionStorage.setItem(STORAGE_PRODUCTS_KEY, JSON.stringify(productPalette)); }, [productPalette]);

  const update = (key: string, value: string) =>
    setFormData((prev) => ({ ...prev, [key]: value }));

  const toggleUnknown = (key: string) => {
    setUnknowns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
        setFormData((p) => ({ ...p, [key]: "" }));
      }
      return next;
    });
  };

  const updateProduct = (index: number, field: keyof ProductEntry, value: string) => {
    setProductPalette(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  // ── Auto-berechnete Werte ──────────────────────────────────────────────────

  const totalRevenue = useMemo(() => {
    const rec = parseFloat(formData.revenueRecurring) || 0;
    const one = parseFloat(formData.revenueOnetime) || 0;
    return rec + one;
  }, [formData.revenueRecurring, formData.revenueOnetime]);

  const totalCosts = useMemo(() => {
    const ads = parseFloat(formData.adsSpendMonthly) || 0;
    const tools = parseFloat(formData.toolsCostsMonthly) || 0;
    const personnel = parseFloat(formData.personnelCostsMonthly) || 0;
    const delivery = parseFloat(formData.deliveryCostsMonthly) || 0;
    const other = parseFloat(formData.otherCostsMonthly) || 0;
    return ads + tools + personnel + delivery + other;
  }, [formData.adsSpendMonthly, formData.toolsCostsMonthly, formData.personnelCostsMonthly, formData.deliveryCostsMonthly, formData.otherCostsMonthly]);

  const profit = totalRevenue - totalCosts;
  const marginPercent = totalRevenue > 0 ? ((profit / totalRevenue) * 100) : 0;

  // AOV = Abschlussvolumen (offerPrice)
  const aovNewAuto = parseFloat(formData.offerPrice) || 0;

  // AOV Bestandskunde: auto aus MRR ÷ Bestandskunden
  const aovExistingAuto = useMemo(() => {
    const mrr = parseFloat(formData.revenueRecurring) || 0;
    const existing = parseFloat(formData.existingCustomers) || 0;
    return mrr > 0 && existing > 0 ? Math.round(mrr / existing) : 0;
  }, [formData.revenueRecurring, formData.existingCustomers]);

  // Volumes
  const newCustomerVolume = useMemo(() => {
    const count = parseFloat(formData.newCustomersMonthly) || 0;
    return aovNewAuto > 0 && count > 0 ? aovNewAuto * count : 0;
  }, [aovNewAuto, formData.newCustomersMonthly]);

  const existingCustomerVolume = useMemo(() => {
    const count = parseFloat(formData.existingCustomers) || 0;
    return aovExistingAuto > 0 && count > 0 ? aovExistingAuto * count : 0;
  }, [aovExistingAuto, formData.existingCustomers]);

  const totalOrderVolume = newCustomerVolume + existingCustomerVolume;

  // LTV = AOV × Retainer-Monate (or 1 if Einmalprojekt)
  const ltvCalculated = useMemo(() => {
    if (formData.offerType === "einmalig") return aovNewAuto;
    const months = parseFloat(formData.retainerMonths) || 0;
    return aovNewAuto > 0 && months > 0 ? aovNewAuto * months : 0;
  }, [aovNewAuto, formData.retainerMonths, formData.offerType]);

  // CAC = Gesamtkosten / Neukunden
  const cacCalculated = useMemo(() => {
    const sales = parseFloat(formData.salesGrossSalary) || 0;
    const salesSide = parseFloat(formData.salesSideCosts) || 0;
    const fulfillment = parseFloat(formData.fulfillmentGrossSalary) || 0;
    const fulfTools = parseFloat(formData.fulfillmentToolCosts) || 0;
    const allCosts = totalCosts + sales + salesSide + fulfillment + fulfTools;
    const newCusts = parseFloat(formData.newCustomersMonthly) || 0;
    return allCosts > 0 && newCusts > 0 ? Math.round(allCosts / newCusts) : 0;
  }, [totalCosts, formData.salesGrossSalary, formData.salesSideCosts, formData.fulfillmentGrossSalary, formData.fulfillmentToolCosts, formData.newCustomersMonthly]);

  const canNext = () => {
    if (step === 0) return formData.companyName.trim().length > 0;
    return true;
  };

  const val = (key: string) => unknowns.has(key) ? null : (parseFloat((formData as any)[key]) || 0);
  const valInt = (key: string) => unknowns.has(key) ? null : (parseInt((formData as any)[key]) || 0);
  const valNullable = (key: string) => {
    if (unknowns.has(key)) return null;
    const v = parseFloat((formData as any)[key]);
    return isNaN(v) ? null : v;
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error("Nicht authentifiziert – bitte neu einloggen");

      const { data: existingTenants } = await supabase
        .from("tenants")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const existingTenant = existingTenants?.[0] ?? null;

      // Build contract_duration string
      const contractDurationStr = formData.offerType === "retainer"
        ? `Retainer – ${formData.retainerMonths || "?"} Monate`
        : formData.offerType === "einmalig" ? "Einmalprojekt" : null;

      // Build product_palette JSON
      const validProducts = productPalette.filter(p => p.name.trim());
      const productPaletteJson = validProducts.map(p => ({
        name: p.name,
        price: parseFloat(p.price) || 0,
        type: p.type || "einmalig",
        retainerMonths: p.type === "retainer" ? (parseInt(p.retainerMonths) || 0) : 0,
        description: p.description,
      }));

      const tenantPayload = {
        company_name: formData.companyName,
        contact_name: formData.contactName || null,
        industry: formData.industry || null,
        team_size: formData.teamSize || null,
        target_audience: formData.targetAudience || null,
        website_url: formData.websiteUrl || null,
        monthly_budget: val("monthlyBudget"),
        linkedin_url: formData.linkedinUrl || null,
        linkedin_followers_current: valInt("linkedinFollowersCurrent"),
        posting_frequency: formData.postingFrequency || null,
        linkedin_experience: formData.linkedinExperience || null,
        current_offer: formData.currentOffer || null,
        offer_price: val("offerPrice"),
        contract_duration: contractDurationStr,
        closing_rate: val("closingRate"),
        revenue_recurring: val("revenueRecurring"),
        revenue_onetime: val("revenueOnetime"),
        current_revenue_monthly: totalRevenue > 0 ? totalRevenue : null,
        ads_spend_monthly: val("adsSpendMonthly"),
        tools_costs_monthly: val("toolsCostsMonthly"),
        personnel_costs_monthly: val("personnelCostsMonthly"),
        delivery_costs_monthly: val("deliveryCostsMonthly"),
        other_costs_monthly: val("otherCostsMonthly"),
        margin_percent: totalRevenue > 0 ? Math.round(marginPercent * 10) / 10 : null,
        cost_per_lead: val("costPerLead"),
        cost_per_appointment: val("costPerAppointment"),
        current_leads_per_month: valInt("currentLeadsPerMonth"),
        current_conversion_rate: val("currentConversionRate"),
        total_customers: valNullable("totalCustomers"),
        existing_customers: valNullable("existingCustomers"),
        new_customers_monthly: valNullable("newCustomersMonthly"),
        aov_new_customer: aovNewAuto > 0 ? aovNewAuto : null,
        aov_existing_customer: aovExistingAuto > 0 ? aovExistingAuto : null,
        new_customer_volume: newCustomerVolume > 0 ? newCustomerVolume : null,
        existing_customer_volume: existingCustomerVolume > 0 ? existingCustomerVolume : null,
        order_volume_monthly: totalOrderVolume > 0 ? totalOrderVolume : null,
        payment_default_rate: valNullable("paymentDefaultRate"),
        ltv_avg_customer: ltvCalculated > 0 ? ltvCalculated : null,
        commission_rate_actual: valNullable("commissionRateActual"),
        commission_rate_target: valNullable("commissionRateTarget"),
        sales_gross_salary: valNullable("salesGrossSalary"),
        sales_side_costs: valNullable("salesSideCosts"),
        fulfillment_gross_salary: valNullable("fulfillmentGrossSalary"),
        fulfillment_tool_costs: valNullable("fulfillmentToolCosts"),
        cac_actual: cacCalculated > 0 ? cacCalculated : null,
        cac_target: null,
        cost_per_customer_fulfillment: valNullable("costPerCustomerFulfillment"),
        goal_leads_monthly: valInt("goalLeadsMonthly"),
        goal_revenue_monthly: val("goalRevenueMonthly"),
        goal_timeframe: formData.goalTimeframe || null,
        primary_goal: formData.primaryGoal || null,
        product_palette: productPaletteJson.length > 0 ? productPaletteJson : null,
        onboarding_completed: true,
      } as any;

      let data: any;

      if (existingTenant) {
        const { data: updated, error } = await supabase
          .from("tenants")
          .update(tenantPayload)
          .eq("id", existingTenant.id)
          .select()
          .single();
        if (error) throw error;
        data = updated;
      } else {
        const { data: inserted, error } = await supabase
          .from("tenants")
          .insert({ user_id: user.id, ...tenantPayload })
          .select()
          .single();
        if (error) throw error;
        data = inserted;
      }

      await refreshTenant();

      // Save ICP customers
      const icpValid = icpClients.filter(c => c.firma && c.branche);
      if (icpValid.length > 0) {
        const icpRows = icpValid.map((c, i) => ({
          tenant_id: data.id,
          customer_name: c.firma,
          contact_name: c.name || null,
          industry: c.branche || null,
          employee_count: c.mitarbeiter || null,
          annual_revenue: c.jahresumsatz || null,
          lead_source: c.leadQuelle || null,
          close_duration: c.closeDauer || null,
          deal_value: parseFloat(c.dealValue) || null,
          payment_status: c.gezahlt || null,
          payment_speed: c.zahlungsSpeed || null,
          has_paid: c.gezahlt === "Ja, komplett",
          collaboration_score: c.zusammenarbeit || 0,
          result_score: c.ergebnis || 0,
          problem_awareness: c.problemBewusstsein || null,
          notes: c.notizen || null,
          close_date: c.closeDate || null,
          onboarding_date: c.onboardingDate || null,
          project_start_date: c.projectStartDate || null,
          project_end_date: c.projectEndDate || null,
          sort_order: i,
        }));
        await supabase.from("icp_customers").insert(icpRows);
      }

      setGeneratingAnalysis(true);
      try {
        await supabase.functions.invoke("generate-summary", {
          body: { tenantId: data.id, scope: "onboarding_initial" },
        });
      } catch { /* non-blocking */ }
      setGeneratingAnalysis(false);

      // Clear persisted onboarding data
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_ICP_KEY);
      sessionStorage.removeItem(STORAGE_STEP_KEY);
      sessionStorage.removeItem(STORAGE_KEY + "_unknowns");
      sessionStorage.removeItem(STORAGE_PRODUCTS_KEY);

      toast({ title: "Profil gespeichert ✓", description: "Deine Basisdaten wurden gespeichert." });
      setTimeout(() => onComplete(), 500);
    } catch (error: any) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setGeneratingAnalysis(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="space-y-3">
        <div className="flex justify-between flex-wrap gap-1">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => i < step && setStep(i)}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                i === step ? "text-primary" : i < step ? "text-primary/60 cursor-pointer hover:text-primary" : "text-muted-foreground"
              }`}
            >
              <div className={`flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold ${
                i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>{i + 1}</div>
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Step 0: Firma */}
      {step === 0 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Firmenprofil</h3>
          <div className="space-y-1.5">
            <Label className="text-sm">Firmenname *</Label>
            <Input value={formData.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="ContentLeads GmbH" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Ansprechpartner</Label>
            <Input value={formData.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="Max Mustermann" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Branche</Label>
            <Select value={formData.industry} onValueChange={(v) => update("industry", v)}>
              <SelectTrigger><SelectValue placeholder="Branche wählen" /></SelectTrigger>
              <SelectContent>
                {["SaaS / Software", "Agentur / Beratung", "E-Commerce", "Finanzdienstleistung", "Immobilien", "Coaching / Training", "Gesundheit / Medizin", "Handwerk / Industrie", "Sonstige"].map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">Teamgröße</Label>
              <Select value={formData.teamSize} onValueChange={(v) => update("teamSize", v)}>
                <SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
                <SelectContent>
                  {["1-5", "6-20", "21-50", "51-200", "200+"].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Website</Label>
              <Input type="url" value={formData.websiteUrl} onChange={(e) => update("websiteUrl", e.target.value)} placeholder="https://..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Zielgruppe</Label>
            <Textarea value={formData.targetAudience} onChange={(e) => update("targetAudience", e.target.value)} placeholder="z.B. B2B-Entscheider, CEOs/CMOs von KMUs in DACH..." rows={2} />
          </div>
        </div>
      )}

      {/* Step 1: LinkedIn */}
      {step === 1 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">LinkedIn-Status</h3>
          <div className="space-y-1.5">
            <Label className="text-sm">LinkedIn-Profil-URL</Label>
            <Input type="url" value={formData.linkedinUrl} onChange={(e) => update("linkedinUrl", e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>
          <NumField label="Aktuelle Follower" fieldKey="linkedinFollowersCurrent" placeholder="500" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
          <div className="space-y-1.5">
            <Label className="text-sm">Posting-Frequenz</Label>
            <Select value={formData.postingFrequency} onValueChange={(v) => update("postingFrequency", v)}>
              <SelectTrigger><SelectValue placeholder="Wie oft?" /></SelectTrigger>
              <SelectContent>
                {["Noch nie", "Sporadisch (< 1x/Woche)", "1-2x pro Woche", "3-5x pro Woche", "Täglich"].map((f) => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">LinkedIn-Erfahrung</Label>
            <Select value={formData.linkedinExperience} onValueChange={(v) => update("linkedinExperience", v)}>
              <SelectTrigger><SelectValue placeholder="Erfahrungslevel" /></SelectTrigger>
              <SelectContent>
                {["Keine Erfahrung", "Grundkenntnisse", "Fortgeschritten", "Profi – nutze LinkedIn aktiv für Sales"].map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Step 2: Standard-Paket & Produktpalette */}
      {step === 2 && (
        <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
          <div>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Dein Standard-Paket</h3>
            <p className="text-xs text-muted-foreground mt-1">Was ist dein Hauptangebot, das du am häufigsten verkaufst?</p>
          </div>

          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Beschreibung deines Angebots</Label>
              <Textarea value={formData.currentOffer} onChange={(e) => update("currentOffer", e.target.value)} placeholder="z.B. LinkedIn-Marketing-Paket inkl. Content, Lead-Gen, Ads..." rows={2} />
            </div>
            <NumField label="Abschlussvolumen (Netto)" fieldKey="offerPrice" placeholder="3000" unit="€ netto" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
            <div className="space-y-1.5">
              <Label className="text-sm">Art des Angebots</Label>
              <Select value={formData.offerType} onValueChange={(v) => update("offerType", v)}>
                <SelectTrigger><SelectValue placeholder="Einmalprojekt oder Retainer?" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="einmalig">Einmalprojekt</SelectItem>
                  <SelectItem value="retainer">Retainer (monatlich wiederkehrend)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formData.offerType === "retainer" && (
              <NumField label="Retainer-Laufzeit" fieldKey="retainerMonths" placeholder="6" unit="Monate" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
            )}
            <NumField label="Closing-Rate" fieldKey="closingRate" placeholder="25" unit="%" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />

            {/* Auto-calculated summary */}
            {(aovNewAuto > 0 || ltvCalculated > 0) && (
              <div className="p-2 rounded-md border border-primary/20 bg-primary/5 space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📊 Automatisch berechnet</p>
                <div className="grid grid-cols-2 gap-3 text-center">
                  {aovNewAuto > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">AOV Neukunde</p>
                      <p className="text-sm font-bold text-primary">{aovNewAuto.toLocaleString("de-DE")} €</p>
                    </div>
                  )}
                  {ltvCalculated > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground">LTV / Kunde</p>
                      <p className="text-sm font-bold text-primary">{ltvCalculated.toLocaleString("de-DE")} €</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Produktpalette */}
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Produktpalette</h3>
              <p className="text-xs text-muted-foreground mt-1">Hast du verschiedene Pakete/Produkte? Trage bis zu 3 ein (Klein, Mittel, Groß).</p>
            </div>

            {productPalette.map((product, idx) => {
              const labels = ["Kleines Paket (z.B. Starter)", "Mittleres Paket (z.B. Professional)", "Großes Paket (z.B. Enterprise)"];
              return (
                <div key={idx} className="p-3 rounded-lg border border-border/60 bg-muted/20 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">{labels[idx]}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Produktname</Label>
                      <Input
                        value={product.name}
                        onChange={(e) => updateProduct(idx, "name", e.target.value)}
                        placeholder={["Starter", "Professional", "Enterprise"][idx]}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Preis (Netto, €)</Label>
                      <Input
                        type="number"
                        value={product.price}
                        onChange={(e) => updateProduct(idx, "price", e.target.value)}
                        placeholder={["1500", "3000", "5000"][idx]}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Art</Label>
                      <Select value={product.type} onValueChange={(v) => updateProduct(idx, "type", v)}>
                        <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Art wählen" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="einmalig">Einmalprojekt</SelectItem>
                          <SelectItem value="retainer">Retainer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {product.type === "retainer" && (
                      <div className="space-y-1">
                        <Label className="text-xs">Laufzeit (Monate)</Label>
                        <Input
                          type="number"
                          value={product.retainerMonths}
                          onChange={(e) => updateProduct(idx, "retainerMonths", e.target.value)}
                          placeholder="6"
                          className="h-8 text-sm"
                        />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Beschreibung</Label>
                    <Input
                      value={product.description}
                      onChange={(e) => updateProduct(idx, "description", e.target.value)}
                      placeholder="Was ist im Paket enthalten?"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: Finanzen */}
      {step === 3 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Monatliche Finanzen <span className="text-primary font-normal normal-case">(alle Angaben Netto)</span></h3>

          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">💰 Einnahmen (Netto)</p>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Wiederkehrend (MRR)" fieldKey="revenueRecurring" placeholder="10000" unit="€ netto/Mo." formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
              <NumField label="Einmalig (Projekte)" fieldKey="revenueOnetime" placeholder="5000" unit="€ netto/Mo." formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
            </div>
            {totalRevenue > 0 && (
              <div className="flex justify-between text-sm font-medium pt-1 border-t border-border/40">
                <span>Gesamt-Einnahmen (Netto)</span>
                <span className="text-primary">{totalRevenue.toLocaleString("de-DE")} €</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📤 Ausgaben (Netto)</p>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Ads / Werbung" fieldKey="adsSpendMonthly" placeholder="2000" unit="€" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
              <NumField label="Tools & Software" fieldKey="toolsCostsMonthly" placeholder="500" unit="€" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
              <NumField label="Personal (gesamt)" fieldKey="personnelCostsMonthly" placeholder="3000" unit="€" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
              <NumField label="Delivery / Fulfillment" fieldKey="deliveryCostsMonthly" placeholder="1000" unit="€" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
              <NumField label="Sonstige Kosten" fieldKey="otherCostsMonthly" placeholder="500" unit="€" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
            </div>
            {totalCosts > 0 && (
              <div className="flex justify-between text-sm font-medium pt-1 border-t border-border/40">
                <span>Gesamt-Ausgaben</span>
                <span className="text-destructive">{totalCosts.toLocaleString("de-DE")} €</span>
              </div>
            )}
          </div>

          {totalRevenue > 0 && (
            <div className="p-3 rounded-lg border-2 border-primary/20 bg-primary/5 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📊 Automatisch berechnet</p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Gewinn / Verlust</p>
                  <p className={`text-lg font-bold ${profit >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                    {profit >= 0 ? "+" : ""}{profit.toLocaleString("de-DE")} €
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Netto-Marge</p>
                  <p className={`text-lg font-bold ${marginPercent >= 30 ? "text-green-600 dark:text-green-400" : marginPercent >= 10 ? "text-yellow-600 dark:text-yellow-400" : "text-destructive"}`}>
                    {marginPercent.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kostenquote</p>
                  <p className="text-lg font-bold text-foreground">
                    {totalRevenue > 0 ? ((totalCosts / totalRevenue) * 100).toFixed(1) : "0"}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Kunden – vereinfacht, AOV/LTV werden auto-berechnet */}
      {step === 4 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Kundenstamm</h3>
          <p className="text-sm text-muted-foreground">AOV, Auftragsvolumen und LTV werden automatisch berechnet.</p>

          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">👥 Kundenanzahl</p>
            <div className="grid grid-cols-3 gap-3">
              <NumField label="Gesamtkunden" fieldKey="totalCustomers" placeholder="6" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
              <NumField label="Bestandskunden" fieldKey="existingCustomers" placeholder="4" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
              <NumField label="Neukunden / Monat" fieldKey="newCustomersMonthly" placeholder="2" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
            </div>
          </div>

          <NumField label="Zahlungsausfallquote" fieldKey="paymentDefaultRate" placeholder="10" unit="%" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />

          {/* Auto-berechnete Werte */}
          {(aovNewAuto > 0 || aovExistingAuto > 0 || ltvCalculated > 0 || totalOrderVolume > 0) && (
            <div className="p-3 rounded-lg border-2 border-primary/20 bg-primary/5 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📊 Automatisch berechnet</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {aovNewAuto > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AOV Neukunde</span>
                    <span className="font-semibold text-primary">{aovNewAuto.toLocaleString("de-DE")} €</span>
                  </div>
                )}
                {aovExistingAuto > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AOV Bestandsk.</span>
                    <span className="font-semibold text-primary">{aovExistingAuto.toLocaleString("de-DE")} €</span>
                  </div>
                )}
                {newCustomerVolume > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Neukundenvolumen</span>
                    <span className="font-semibold">{newCustomerVolume.toLocaleString("de-DE")} €</span>
                  </div>
                )}
                {existingCustomerVolume > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bestandskundenvolumen</span>
                    <span className="font-semibold">{existingCustomerVolume.toLocaleString("de-DE")} €</span>
                  </div>
                )}
                {totalOrderVolume > 0 && (
                  <div className="flex justify-between col-span-2 pt-1 border-t border-border/40">
                    <span className="font-semibold">Auftragsvolumen gesamt</span>
                    <span className="font-bold text-primary">{totalOrderVolume.toLocaleString("de-DE")} €</span>
                  </div>
                )}
                {ltvCalculated > 0 && (
                  <div className="flex justify-between col-span-2">
                    <span className="font-semibold">LTV / Kunde</span>
                    <span className="font-bold text-primary">{ltvCalculated.toLocaleString("de-DE")} €</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 5: ICP-Analyse */}
      {step === 5 && (
        <ICPAnalysisStep
          clients={icpClients}
          setClients={setIcpClients}
          showResults={icpShowResults}
          setShowResults={setIcpShowResults}
        />
      )}

      {/* Step 6: Vertrieb & Kosten – CAC auto-berechnet */}
      {step === 6 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Vertrieb & Personalkosten</h3>

          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">💰 Provisionen</p>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Provisionssatz IST" fieldKey="commissionRateActual" placeholder="0" unit="%" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
              <NumField label="Provisionssatz SOLL" fieldKey="commissionRateTarget" placeholder="17.5" unit="%" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🏢 Personalkosten (Brutto)</p>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Bruttogehalt Vertrieb" fieldKey="salesGrossSalary" placeholder="1175" unit="€" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
              <NumField label="Nebenkosten Vertrieb" fieldKey="salesSideCosts" placeholder="130" unit="€" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
              <NumField label="Bruttogehalt Fulfillment" fieldKey="fulfillmentGrossSalary" placeholder="1175" unit="€" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
              <NumField label="Tools Fulfillment" fieldKey="fulfillmentToolCosts" placeholder="1537" unit="€" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
            </div>
          </div>

          <NumField label="Kosten / Kunde (Fulfillment)" fieldKey="costPerCustomerFulfillment" placeholder="550" unit="€" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />

          {/* CAC auto-berechnet */}
          {cacCalculated > 0 && (
            <div className="p-3 rounded-lg border-2 border-primary/20 bg-primary/5 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🎯 Automatisch berechnet</p>
              <div className="flex justify-between text-sm font-semibold">
                <span>CAC (Gesamtkosten ÷ Neukunden)</span>
                <span className="text-primary">{cacCalculated.toLocaleString("de-DE")} € / Neukunde</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 7: KPIs */}
      {step === 7 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Aktuelle Kennzahlen</h3>
          <p className="text-sm text-muted-foreground">Schätzwerte reichen – oder klicke „Weiß ich nicht".</p>

          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">📈 Performance</p>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Leads / Monat" fieldKey="currentLeadsPerMonth" placeholder="20" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
              <NumField label="Conversion-Rate (Lead→Kunde)" fieldKey="currentConversionRate" placeholder="2.5" unit="%" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
              <NumField label="Marketingbudget / Monat" fieldKey="monthlyBudget" placeholder="5000" unit="€" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
            </div>
          </div>

          <div className="p-3 rounded-lg border border-border/60 bg-muted/30 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">💲 Stückkosten</p>
            <div className="grid grid-cols-2 gap-3">
              <NumField label="Kosten / Lead" fieldKey="costPerLead" placeholder="50" unit="€" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
              <NumField label="Kosten / Termin" fieldKey="costPerAppointment" placeholder="150" unit="€" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
            </div>
          </div>
        </div>
      )}

      {/* Step 8: Ziele */}
      {step === 8 && (
        <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Ziele & Erwartungen</h3>
          <div className="space-y-1.5">
            <Label className="text-sm">Hauptziel</Label>
            <Select value={formData.primaryGoal} onValueChange={(v) => update("primaryGoal", v)}>
              <SelectTrigger><SelectValue placeholder="Was ist dein Hauptziel?" /></SelectTrigger>
              <SelectContent>
                {["Mehr qualifizierte Leads", "Umsatz steigern", "Marge verbessern", "Markenbekanntheit aufbauen", "Recruiting / Employer Branding", "Thought Leadership", "Kosten senken"].map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <NumField label="Ziel-Leads / Monat" fieldKey="goalLeadsMonthly" placeholder="50" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
            <NumField label="Ziel-Umsatz / Monat (Netto)" fieldKey="goalRevenueMonthly" placeholder="25000" unit="€ netto" formData={formData} unknowns={unknowns} update={update} toggleUnknown={toggleUnknown} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Zeitrahmen</Label>
            <Select value={formData.goalTimeframe} onValueChange={(v) => update("goalTimeframe", v)}>
              <SelectTrigger><SelectValue placeholder="In welchem Zeitraum?" /></SelectTrigger>
              <SelectContent>
                {["1 Monat", "3 Monate", "6 Monate", "12 Monate"].map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)} disabled={step === 0 || loading}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Zurück
        </Button>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
            Weiter <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading || !canNext()}>
            {loading && !generatingAnalysis && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {generatingAnalysis && <Sparkles className="mr-2 h-4 w-4 animate-pulse" />}
            {generatingAnalysis ? "Erstanalyse läuft..." : "Profil erstellen & Analyse starten"}
          </Button>
        )}
      </div>
    </div>
  );
}

// Standalone NumField to prevent focus loss on re-render
function NumField({
  label, fieldKey, placeholder, unit, formData, unknowns, update, toggleUnknown
}: {
  label: string;
  fieldKey: string;
  placeholder: string;
  unit?: string;
  formData: Record<string, string>;
  unknowns: Set<string>;
  update: (key: string, value: string) => void;
  toggleUnknown: (key: string) => void;
}) {
  const isUnknown = unknowns.has(fieldKey);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm">
          {label}
          {unit && <span className="text-muted-foreground ml-1 font-normal text-xs">({unit})</span>}
        </Label>
        <button
          type="button"
          onClick={() => toggleUnknown(fieldKey)}
          className={`flex items-center gap-1 text-[11px] rounded-full px-2 py-0.5 transition-colors ${
            isUnknown
              ? "bg-primary/10 text-primary font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <HelpCircle className="h-3 w-3" />
          Weiß ich nicht
        </button>
      </div>
      <Input
        type="number"
        step="any"
        value={isUnknown ? "" : formData[fieldKey]}
        onChange={(e) => update(fieldKey, e.target.value)}
        placeholder={isUnknown ? "– wird übersprungen –" : placeholder}
        disabled={isUnknown}
        className={isUnknown ? "bg-muted/50 text-muted-foreground" : ""}
      />
    </div>
  );
}
