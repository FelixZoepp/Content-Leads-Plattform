import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Users, Briefcase, Activity, TrendingUp, UserX, Eye, Trash2, Euro, RefreshCw, CreditCard, CheckCircle2, XCircle, Clock, AlertCircle, Loader2, BarChart3, TrendingDown, DollarSign, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Account {
  id: string;
  name: string;
  company_name: string | null;
  email: string | null;
  is_active: boolean;
  subscription_status: string;
  created_at: string;
}

interface AccountWithStats extends Account {
  contacts_count: number;
  deals_count: number;
  activities_count: number;
  users_count: number;
  subscription?: {
    plan_name: string | null;
    status: string;
    current_period_end: string | null;
  };
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  is_super_admin: boolean;
  trial_ends_at: string | null;
  account_id: string | null;
  created_at: string;
  accounts?: { name: string } | null;
}

interface MrrHistoryItem {
  month: string;
  mrr: number;
  subscriptions: number;
}

interface StripeStats {
  mrr: number;
  arr: number;
  totalSubscriptions: number;
  statusCounts: {
    active: number;
    canceled: number;
    past_due: number;
    trialing: number;
    incomplete: number;
    other: number;
  };
  subscriptionsByPlan: Record<string, number>;
  activeSubscriptions: StripeSubscription[];
  canceledSubscriptions: StripeSubscription[];
  mrrHistory: MrrHistoryItem[];
  churnRate: number;
  avgLifetimeMonths: number;
  arpu: number;
  clv: number;
  canceledLast30Days: number;
}

interface StripeSubscription {
  id: string;
  status: string;
  planName: string;
  monthlyAmount: number;
  customerEmail: string;
  customerName: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  created: string;
}

const PLAN_DISPLAY: Record<string, { name: string; color: string }> = {
  "prod_Tka87AKXNmsZUv": { name: "Starter", color: "bg-blue-500" },
  "prod_TkaAeLeq8rEn90": { name: "Starter (Jahr)", color: "bg-blue-500" },
  "prod_TkoJ98sfzflYyR": { name: "Pro", color: "bg-purple-500" },
  "prod_TkoJ8E0e8l4vwV": { name: "Pro (Jahr)", color: "bg-purple-500" },
};

const PLAN_COLORS: Record<string, string> = {
  "Starter": "bg-blue-500",
  "Starter (Jahr)": "bg-blue-600",
  "Pro": "bg-purple-500",
  "Pro (Jahr)": "bg-purple-600",
  "Unknown": "bg-slate-500",
};

export default function MasterAdmin() {
  const [accountsWithStats, setAccountsWithStats] = useState<AccountWithStats[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [stripeStats, setStripeStats] = useState<StripeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [userToRemoveAccess, setUserToRemoveAccess] = useState<UserProfile | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkSuperAdminAndFetchData();
  }, []);

  const fetchStripeStats = async () => {
    setStripeLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-stripe-stats');
      if (error) throw error;
      setStripeStats(data);
    } catch (error) {
      console.error('Error fetching Stripe stats:', error);
      toast.error("Fehler beim Laden der Stripe-Daten");
    } finally {
      setStripeLoading(false);
    }
  };

  const checkSuperAdminAndFetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Check if user is super admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_super_admin) {
        toast.error("Kein Zugriff - nur für Master-Admins");
        navigate('/pipeline');
        return;
      }

      setIsSuperAdmin(true);
      
      // Fetch Stripe stats
      fetchStripeStats();
      const { data: accounts, error } = await supabase
        .from('accounts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch stats for all accounts in parallel
      const accountsData = await Promise.all(
        (accounts || []).map(async (account) => {
          const [contactsRes, dealsRes, activitiesRes, usersRes] = await Promise.all([
            supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('account_id', account.id),
            supabase.from('deals').select('id', { count: 'exact', head: true }).eq('account_id', account.id),
            supabase.from('activities').select('id', { count: 'exact', head: true }).eq('account_id', account.id),
            supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('account_id', account.id),
          ]);

          // Get subscription for this account
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id')
            .eq('account_id', account.id)
            .limit(1);

          let subscription = undefined;
          if (profiles && profiles.length > 0) {
            const { data: sub } = await supabase
              .from('subscriptions')
              .select('plan_name, status, current_period_end')
              .eq('user_id', profiles[0].id)
              .single();
            if (sub) {
              subscription = sub;
            }
          }

          return {
            ...account,
            contacts_count: contactsRes.count || 0,
            deals_count: dealsRes.count || 0,
            activities_count: activitiesRes.count || 0,
            users_count: usersRes.count || 0,
            subscription,
          };
        })
      );

      setAccountsWithStats(accountsData);

      // Fetch all users
      const { data: usersData } = await supabase
        .from('profiles')
        .select(`
          id,
          name,
          email,
          role,
          is_super_admin,
          trial_ends_at,
          account_id,
          created_at,
          accounts:account_id (name)
        `)
        .order('created_at', { ascending: false });

      if (usersData) {
        setAllUsers(usersData as unknown as UserProfile[]);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  const handleViewAccount = (accountId: string) => {
    sessionStorage.setItem('master_admin_account_id', accountId);
    navigate('/pipeline');
  };

  const handleRemoveAccess = async () => {
    if (!userToRemoveAccess) return;

    try {
      // Remove trial access by setting trial_ends_at to past date
      const { error } = await supabase
        .from('profiles')
        .update({ trial_ends_at: new Date('2000-01-01').toISOString() })
        .eq('id', userToRemoveAccess.id);

      if (error) throw error;

      toast.success(`Zugang für ${userToRemoveAccess.name} entfernt`);
      setUserToRemoveAccess(null);
      checkSuperAdminAndFetchData();
    } catch (error: any) {
      console.error('Error removing access:', error);
      toast.error("Fehler: " + error.message);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      // Delete profile (this won't delete auth user but removes app access)
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;

      toast.success(`Nutzer ${userToDelete.name} gelöscht`);
      setUserToDelete(null);
      checkSuperAdminAndFetchData();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error("Fehler: " + error.message);
    }
  };

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Lädt...</p>
        </div>
      </>
    );
  }

  if (!isSuperAdmin) {
    return null;
  }

  // Summary stats
  const totalAccounts = accountsWithStats.length;
  const activeAccounts = accountsWithStats.filter(a => a.is_active).length;
  const totalContacts = accountsWithStats.reduce((sum, a) => sum + a.contacts_count, 0);
  const totalDeals = accountsWithStats.reduce((sum, a) => sum + a.deals_count, 0);
  const totalUsers = allUsers.length;

  return (
    <>
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Master Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Übersicht aller Kennzahlen
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchStripeStats}
                disabled={stripeLoading}
              >
                {stripeLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Aktualisieren
              </Button>
              <Badge variant="destructive">Super Admin</Badge>
            </div>
          </div>
        </div>

        {/* Revenue Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-card border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-transparent">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-amber-400/80 mb-1">+ MRR</p>
                  <p className="text-2xl font-bold text-amber-400">
                    {stripeLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      `${(stripeStats?.mrr || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Monatl. Umsatz</p>
                </div>
                <div className="p-2 rounded-xl bg-amber-500/20">
                  <Euro className="h-5 w-5 text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-transparent">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-emerald-400/80 mb-1">ARR</p>
                  <p className="text-2xl font-bold text-emerald-400">
                    {stripeLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      `${(stripeStats?.arr || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Jährl. Umsatz</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-500/20">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-cyan-400/80 mb-1">CLV</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    {stripeLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      `${(stripeStats?.clv || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Customer Lifetime Value</p>
                </div>
                <div className="p-2 rounded-xl bg-cyan-500/20">
                  <DollarSign className="h-5 w-5 text-cyan-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-rose-500/30 bg-gradient-to-br from-rose-500/10 to-transparent">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-rose-400/80 mb-1">Churn Rate</p>
                  <p className="text-2xl font-bold text-rose-400">
                    {stripeLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      `${stripeStats?.churnRate || 0}%`
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {stripeStats?.canceledLast30Days || 0} in 30 Tagen
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-rose-500/20">
                  <TrendingDown className="h-5 w-5 text-rose-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ARPU</p>
                  <p className="text-xl font-bold text-foreground">
                    {stripeLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      `${(stripeStats?.arpu || 0).toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Ø Umsatz/Kunde</p>
                </div>
                <div className="p-2 rounded-xl bg-primary/10">
                  <Euro className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ø Lifetime</p>
                  <p className="text-xl font-bold text-foreground">
                    {stripeLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      `${stripeStats?.avgLifetimeMonths || 0} Mon.`
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Durchschn. Kundendauer</p>
                </div>
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Clock className="h-4 w-4 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Aktive Abos</p>
                  <p className="text-xl font-bold text-foreground">
                    {stripeLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      stripeStats?.statusCounts?.active || 0
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    +{stripeStats?.statusCounts?.trialing || 0} Trial
                  </p>
                </div>
                <div className="p-2 rounded-xl bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Gekündigt</p>
                  <p className="text-xl font-bold text-foreground">
                    {stripeLoading ? (
                      <span className="animate-pulse">...</span>
                    ) : (
                      stripeStats?.statusCounts?.canceled || 0
                    )}
                  </p>
                  <p className="text-[10px] text-muted-foreground">insgesamt</p>
                </div>
                <div className="p-2 rounded-xl bg-red-500/10">
                  <UserMinus className="h-4 w-4 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* MRR History Chart */}
        {stripeStats?.mrrHistory && stripeStats.mrrHistory.length > 0 && (
          <Card className="glass-card mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                MRR-Verlauf (Letzte 6 Monate)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stripeLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={stripeStats.mrrHistory}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="mrrGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis 
                        dataKey="month" 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="hsl(var(--muted-foreground))"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value.toLocaleString('de-DE')}€`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
                        }}
                        labelStyle={{ color: 'hsl(var(--foreground))' }}
                        formatter={(value: number, name: string) => {
                          if (name === 'mrr') return [`${value.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`, 'MRR'];
                          if (name === 'subscriptions') return [value, 'Abos'];
                          return [value, name];
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="mrr"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#mrrGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Monatlicher Umsatz (MRR)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User & Account Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-500/10">
                  <Building2 className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalAccounts}</p>
                  <p className="text-xs text-muted-foreground">Accounts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{activeAccounts}</p>
                  <p className="text-xs text-muted-foreground">Aktiv</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500/10">
                  <Users className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Nutzer</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalContacts}</p>
                  <p className="text-xs text-muted-foreground">Kontakte</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-500/10">
                  <Briefcase className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalDeals}</p>
                  <p className="text-xs text-muted-foreground">Deals</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plan Distribution */}
        {stripeStats?.subscriptionsByPlan && Object.keys(stripeStats.subscriptionsByPlan).length > 0 && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  Abos nach Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stripeStats.subscriptionsByPlan).map(([plan, count]) => (
                    <div key={plan} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={`${PLAN_COLORS[plan] || 'bg-slate-500'} text-white text-xs`}>
                          {plan}
                        </Badge>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Status-Verteilung
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <div>
                      <p className="text-sm font-medium">{stripeStats.statusCounts.active}</p>
                      <p className="text-xs text-muted-foreground">Aktiv</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-500/10">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <div>
                      <p className="text-sm font-medium">{stripeStats.statusCounts.trialing}</p>
                      <p className="text-xs text-muted-foreground">Trial</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/10">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <div>
                      <p className="text-sm font-medium">{stripeStats.statusCounts.canceled}</p>
                      <p className="text-xs text-muted-foreground">Gekündigt</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <div>
                      <p className="text-sm font-medium">{stripeStats.statusCounts.past_due}</p>
                      <p className="text-xs text-muted-foreground">Überfällig</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="subscriptions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="subscriptions">Abonnements ({stripeStats?.activeSubscriptions?.length || 0})</TabsTrigger>
            <TabsTrigger value="accounts">Accounts ({totalAccounts})</TabsTrigger>
            <TabsTrigger value="users">Nutzer ({totalUsers})</TabsTrigger>
          </TabsList>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Aktive Abonnements</CardTitle>
              </CardHeader>
              <CardContent>
                {stripeLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : stripeStats?.activeSubscriptions?.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Keine aktiven Abonnements</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Kunde</th>
                            <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Plan</th>
                            <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Monatl.</th>
                            <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Status</th>
                            <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Verlängert am</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stripeStats?.activeSubscriptions?.map((sub) => (
                            <tr key={sub.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                              <td className="py-3 px-2">
                                <div>
                                  <p className="font-medium text-sm">{sub.customerName}</p>
                                  <p className="text-xs text-muted-foreground">{sub.customerEmail}</p>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <Badge className={`${PLAN_COLORS[sub.planName] || 'bg-slate-500'} text-white text-[10px]`}>
                                  {sub.planName}
                                </Badge>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className="text-sm font-medium">{sub.monthlyAmount.toFixed(2)} €</span>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <Badge variant="outline" className={`text-[10px] ${
                                  sub.status === 'active' ? 'text-green-400 border-green-500/30' :
                                  sub.status === 'trialing' ? 'text-blue-400 border-blue-500/30' :
                                  'text-muted-foreground'
                                }`}>
                                  {sub.status === 'active' ? 'Aktiv' : sub.status === 'trialing' ? 'Trial' : sub.status}
                                </Badge>
                                {sub.cancelAtPeriodEnd && (
                                  <Badge variant="destructive" className="text-[10px] ml-1">Kündigt</Badge>
                                )}
                              </td>
                              <td className="py-3 px-2 text-right">
                                <span className="text-xs text-muted-foreground">
                                  {sub.currentPeriodEnd 
                                    ? format(new Date(sub.currentPeriodEnd), "dd.MM.yyyy", { locale: de })
                                    : '–'
                                  }
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accounts Tab */}
          <TabsContent value="accounts">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Alle Accounts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Account</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Plan</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                          <Users className="h-4 w-4 inline" />
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                          <Briefcase className="h-4 w-4 inline" />
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">
                          <Activity className="h-4 w-4 inline" />
                        </th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">User</th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Erstellt</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountsWithStats.map((account) => {
                        const planInfo = account.subscription?.plan_name 
                          ? PLAN_DISPLAY[account.subscription.plan_name] 
                          : null;

                        return (
                          <tr 
                            key={account.id} 
                            className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                            onClick={() => handleViewAccount(account.id)}
                          >
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">{account.name}</p>
                                  {account.company_name && (
                                    <p className="text-xs text-muted-foreground">{account.company_name}</p>
                                  )}
                                </div>
                                {!account.is_active && (
                                  <Badge variant="secondary" className="text-[10px] ml-2">Inaktiv</Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-center">
                              {planInfo ? (
                                <Badge className={`${planInfo.color} text-white text-[10px]`}>
                                  {planInfo.name}
                                </Badge>
                              ) : account.subscription?.status === 'active' ? (
                                <Badge variant="outline" className="text-[10px]">Aktiv</Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">–</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="text-sm font-medium">{account.contacts_count}</span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="text-sm font-medium">{account.deals_count}</span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="text-sm font-medium">{account.activities_count}</span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <span className="text-sm font-medium">{account.users_count}</span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span className="text-xs text-muted-foreground">
                                {new Date(account.created_at).toLocaleDateString('de-DE')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Alle Nutzer</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Nutzer</th>
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Account</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Plan</th>
                        <th className="text-center py-3 px-2 text-sm font-medium text-muted-foreground">Trial endet</th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Erstellt</th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map((user) => {
                        const hasActiveTrial = user.trial_ends_at && new Date(user.trial_ends_at) > new Date();
                        
                        // Determine display plan: Master Admin > Pro (admin role or subscription) > Standard
                        const getPlanDisplay = () => {
                          if (user.is_super_admin) {
                            return { label: "Master Admin", color: "bg-gradient-to-r from-amber-500 to-orange-500" };
                          }
                          if (user.role === 'admin' || hasActiveTrial) {
                            return { label: "Pro", color: "bg-purple-500" };
                          }
                          return { label: "Standard", color: "bg-slate-500" };
                        };
                        
                        const planDisplay = getPlanDisplay();
                        
                        return (
                          <tr 
                            key={user.id} 
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">{user.name}</p>
                                  <p className="text-xs text-muted-foreground">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <span className="text-sm">{user.accounts?.name || "–"}</span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              <Badge className={`${planDisplay.color} text-white text-[10px]`}>
                                {planDisplay.label}
                              </Badge>
                            </td>
                            <td className="py-3 px-2 text-center">
                              {user.trial_ends_at ? (
                                <span className={`text-xs ${hasActiveTrial ? 'text-green-400' : 'text-muted-foreground'}`}>
                                  {format(new Date(user.trial_ends_at), "dd.MM.yyyy", { locale: de })}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">–</span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-right">
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(user.created_at), "dd.MM.yyyy", { locale: de })}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-right">
                              <div className="flex items-center justify-end gap-1">
                                {user.account_id && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleViewAccount(user.account_id!)}
                                    title="Account ansehen"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                )}
                                {!user.is_super_admin && hasActiveTrial && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setUserToRemoveAccess(user)}
                                    title="Zugang entfernen"
                                  >
                                    <UserX className="h-4 w-4 text-orange-400" />
                                  </Button>
                                )}
                                {!user.is_super_admin && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setUserToDelete(user)}
                                    title="Nutzer löschen"
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Remove Access Dialog */}
      <AlertDialog open={!!userToRemoveAccess} onOpenChange={() => setUserToRemoveAccess(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zugang entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              Der Trial-Zugang für <strong>{userToRemoveAccess?.name}</strong> wird deaktiviert. 
              Der Nutzer kann die App weiterhin nutzen, hat aber keinen Pro-Zugriff mehr.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveAccess} className="bg-orange-500 hover:bg-orange-600">
              Zugang entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete User Dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nutzer löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{userToDelete?.name}</strong> ({userToDelete?.email}) wird vollständig entfernt.
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
              Nutzer löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}