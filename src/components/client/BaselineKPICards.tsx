import { Users, TrendingUp, Target, DollarSign, BarChart3, Percent, ShoppingBag, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BaselineKPICardsProps {
  tenant: any;
}

function fmt(v: number | null | undefined, unit = "€", decimals = 0) {
  if (v === null || v === undefined || v === 0) return "–";
  return v.toLocaleString("de-DE", { maximumFractionDigits: decimals }) + (unit ? " " + unit : "");
}

function fmtPct(v: number | null | undefined, decimals = 1) {
  if (v === null || v === undefined || v === 0) return "–";
  return v.toLocaleString("de-DE", { maximumFractionDigits: decimals }) + " %";
}

interface KPITileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

function KPITile({ icon, label, value, sub, color = "bg-muted/40" }: KPITileProps) {
  if (value === "–") return null;
  return (
    <div className={`flex items-start gap-3 rounded-xl p-3 ${color} border border-border/40`}>
      <div className="mt-0.5 text-primary shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
        <p className="text-sm font-bold text-foreground truncate">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function BaselineKPICards({ tenant }: BaselineKPICardsProps) {
  if (!tenant) return null;

  // Check if any Phase-1 KPIs exist
  const hasCustomerData = tenant.total_customers || tenant.new_customers_monthly || tenant.existing_customers;
  const hasVolumeData = tenant.new_customer_volume || tenant.existing_customer_volume || tenant.order_volume_monthly;
  const hasAovLtv = tenant.aov_new_customer || tenant.aov_existing_customer || tenant.ltv_avg_customer;
  const hasCac = tenant.cac_actual || tenant.cac_target;
  const hasCommissions = tenant.commission_rate_actual || tenant.commission_rate_target;
  const hasCosts = tenant.sales_gross_salary || tenant.fulfillment_gross_salary || tenant.sales_side_costs || tenant.fulfillment_tool_costs;

  const hasAnyData = hasCustomerData || hasVolumeData || hasAovLtv || hasCac || hasCommissions || hasCosts;
  if (!hasAnyData) return null;

  // LTGP/CAC Ratio
  const ltgp = tenant.ltv_avg_customer;
  const cac = tenant.cac_actual;
  const ltgpCacRatio = ltgp && cac && cac > 0 ? (ltgp / cac).toFixed(2) : null;

  // Total order volume
  const orderVolume = tenant.order_volume_monthly ||
    ((tenant.new_customer_volume || 0) + (tenant.existing_customer_volume || 0)) || null;

  return (
    <Card className="glass-card">
      <CardContent className="pt-4 pb-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">📊 Ausgangslage (Phase 1)</h3>
            <p className="text-xs text-muted-foreground">Basisdaten aus dem Onboarding – Stand bei Vertragsbeginn</p>
          </div>
          <Badge variant="secondary" className="text-xs">Baseline</Badge>
        </div>

        {/* Section: Kundenstamm */}
        {hasCustomerData && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">👥 Kundenstamm</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <KPITile
                icon={<Users className="h-4 w-4" />}
                label="Gesamtkunden"
                value={fmt(tenant.total_customers, "", 0)}
              />
              <KPITile
                icon={<Users className="h-4 w-4" />}
                label="Bestandskunden"
                value={fmt(tenant.existing_customers, "", 0)}
              />
              <KPITile
                icon={<TrendingUp className="h-4 w-4" />}
                label="Neukunden / Monat"
                value={fmt(tenant.new_customers_monthly, "", 0)}
              />
            </div>
          </div>
        )}

        {/* Section: Auftragsvolumen */}
        {hasVolumeData && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">💶 Auftragsvolumen</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <KPITile
                icon={<DollarSign className="h-4 w-4" />}
                label="Neukundenvolumen"
                value={fmt(tenant.new_customer_volume)}
              />
              <KPITile
                icon={<DollarSign className="h-4 w-4" />}
                label="Bestandskundenvolumen"
                value={fmt(tenant.existing_customer_volume)}
              />
              <KPITile
                icon={<BarChart3 className="h-4 w-4" />}
                label="Auftragsvolumen gesamt"
                value={fmt(orderVolume)}
                color="bg-primary/5"
              />
            </div>
            {tenant.payment_default_rate > 0 && (
              <div className="grid grid-cols-1 gap-2">
                <KPITile
                  icon={<AlertTriangle className="h-4 w-4 text-warning" />}
                  label="Zahlungsausfallquote"
                  value={fmtPct(tenant.payment_default_rate)}
                  color="bg-warning/10"
                />
              </div>
            )}
          </div>
        )}

        {/* Section: AOV / LTV */}
        {hasAovLtv && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">📈 AOV & LTV</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <KPITile
                icon={<ShoppingBag className="h-4 w-4" />}
                label="AOV Neukunde"
                value={fmt(tenant.aov_new_customer)}
              />
              <KPITile
                icon={<ShoppingBag className="h-4 w-4" />}
                label="AOV Bestandskunde"
                value={fmt(tenant.aov_existing_customer)}
              />
              <KPITile
                icon={<TrendingUp className="h-4 w-4" />}
                label="LTV Ø-Kundenwert"
                value={fmt(tenant.ltv_avg_customer)}
                color="bg-primary/5"
              />
            </div>
          </div>
        )}

        {/* Section: CAC */}
        {hasCac && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">🎯 Customer Acquisition Costs</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <KPITile
                icon={<Target className="h-4 w-4" />}
                label="CAC IST"
                value={fmt(tenant.cac_actual)}
              />
              <KPITile
                icon={<Target className="h-4 w-4" />}
                label="CAC SOLL"
                value={fmt(tenant.cac_target)}
              />
              {ltgpCacRatio && (
                <KPITile
                  icon={<BarChart3 className="h-4 w-4" />}
                  label="LTV/CAC Ratio"
                  value={`${ltgpCacRatio}x`}
                  sub={parseFloat(ltgpCacRatio) >= 3 ? "✅ Gesund" : parseFloat(ltgpCacRatio) >= 1 ? "⚠️ Optimierbar" : "🔴 Kritisch"}
                  color={parseFloat(ltgpCacRatio) >= 3 ? "bg-success/10" : parseFloat(ltgpCacRatio) >= 1 ? "bg-warning/10" : "bg-destructive/10"}
                />
              )}
            </div>
            {tenant.cost_per_customer_fulfillment > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <KPITile
                  icon={<DollarSign className="h-4 w-4" />}
                  label="Kosten/Kunde (Fulfillment)"
                  value={fmt(tenant.cost_per_customer_fulfillment)}
                />
              </div>
            )}
          </div>
        )}

        {/* Section: Provisionen */}
        {hasCommissions && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">💰 Provisionen & Personal</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <KPITile
                icon={<Percent className="h-4 w-4" />}
                label="Provisionssatz IST"
                value={fmtPct(tenant.commission_rate_actual)}
              />
              <KPITile
                icon={<Percent className="h-4 w-4" />}
                label="Provisionssatz SOLL"
                value={fmtPct(tenant.commission_rate_target)}
              />
              <KPITile
                icon={<DollarSign className="h-4 w-4" />}
                label="Gehalt Vertrieb"
                value={fmt(tenant.sales_gross_salary)}
              />
              <KPITile
                icon={<DollarSign className="h-4 w-4" />}
                label="Gehalt Fulfillment"
                value={fmt(tenant.fulfillment_gross_salary)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
