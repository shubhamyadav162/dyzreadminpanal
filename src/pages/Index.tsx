
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout"
import { DashboardCard } from "@/components/DashboardCard"
import { RecentTransactions } from "@/components/RecentTransactions"
import { UsersChart } from "@/components/UsersChart"
import { Users, Calendar, Upload, ChevronUp } from "lucide-react"
import { useSubscribers } from "@/hooks/useSubscribers"
import { usePaymentMonitor } from "@/hooks/usePaymentMonitor"
import { supabase } from "@/integrations/supabase/client"
import { parseISO, isSameDay, isWithinInterval, startOfDay, endOfDay, getDay, startOfWeek, endOfWeek, format } from "date-fns";
import { SubscriptionDetailsTable } from "@/components/SubscriptionDetailsTable";

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

// Helper: UTC date को IST date में बदलो
function toIST(dateInput: string | Date): Date {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  // IST offset: +5:30 (in minutes)
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (5.5 * 60 * 60 * 1000));
}

const Index = () => {
  const { subscribers, totalUsers, activeUsers, loading: usersLoading } = useSubscribers();
  const { payments, loading: paymentsLoading } = usePaymentMonitor(1000);
  const [seriesCount, setSeriesCount] = useState<number>(0);

  // Revenue calculations
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [yesterdayRevenue, setYesterdayRevenue] = useState(0);
  const [weekendRevenue, setWeekendRevenue] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    async function fetchSeriesCount() {
      const { count } = await supabase
        .from('series_meta')
        .select('id', { count: 'exact', head: true });
      setSeriesCount(count || 0);
    }
    fetchSeriesCount();
  }, []);

  useEffect(() => {
    if (paymentsLoading) return;
    const now = toIST(new Date());
    const todayStr = format(now, 'yyyy-MM-dd');
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
    let today = 0, yesterdayAmt = 0, weekend = 0, total = 0;
    payments.forEach((p) => {
      if (p.status === 'paid' || p.status === 'captured') {
        const dateStr = (p as any).completed_at || p.created_at;
        if (!dateStr) return;
        const istDate = toIST(dateStr);
        const dateOnly = format(istDate, 'yyyy-MM-dd');
        total += p.amount;
        if (dateOnly === todayStr) today += p.amount;
        if (dateOnly === yesterdayStr) yesterdayAmt += p.amount;
        // Weekend: Saturday (6) या Sunday (0)
        const day = istDate.getDay();
        if (day === 0 || day === 6) weekend += p.amount;
      }
    });
    setTodayRevenue(today / 100);
    setYesterdayRevenue(yesterdayAmt / 100);
    setWeekendRevenue(weekend / 100);
    setTotalRevenue(total / 100);
    setLastUpdated(new Date().toLocaleString());
  }, [payments, paymentsLoading]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="text-muted-foreground">Welcome back to Dzyre Play OTT Admin Panel</p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <DashboardCard
            title="Total Users"
            value={usersLoading ? '...' : totalUsers.toLocaleString('en-IN')}
            subtitle="Since last month"
            icon={<Users className="h-4 w-4 text-primary" />}
            trend={undefined}
          />
          <DashboardCard
            title="Active Subscriptions"
            value={usersLoading ? '...' : activeUsers.toLocaleString('en-IN')}
            subtitle="Since last month"
            icon={<Calendar className="h-4 w-4 text-primary" />}
            trend={undefined}
          />
          <DashboardCard
            title="Total Revenue"
            value={paymentsLoading ? '...' : formatCurrency(totalRevenue)}
            subtitle="Since last month"
            icon={<ChevronUp className="h-4 w-4 text-primary" />}
            trend={undefined}
          />
          <DashboardCard
            title="Web Series"
            value={seriesCount.toLocaleString('en-IN')}
            subtitle="Total Uploaded"
            icon={<Upload className="h-4 w-4 text-primary" />}
            trend={undefined}
          />
        </div>

        {/* Revenue Today/Yesterday/Weekend */}
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <DashboardCard
              title="Today's Collection"
              value={paymentsLoading ? '...' : formatCurrency(todayRevenue)}
              subtitle="Today"
              icon={<ChevronUp className="h-4 w-4 text-primary" />}
              trend={undefined}
            />
            <div className="text-xs text-muted-foreground mt-1 ml-2">Last updated: {lastUpdated}</div>
          </div>
          <DashboardCard
            title="Yesterday's Collection"
            value={paymentsLoading ? '...' : formatCurrency(yesterdayRevenue)}
            subtitle="Yesterday"
            icon={<ChevronUp className="h-4 w-4 text-primary" />}
            trend={undefined}
          />
          <DashboardCard
            title="Weekend Collection"
            value={paymentsLoading ? '...' : formatCurrency(weekendRevenue)}
            subtitle="(Saturday/Sunday)"
            icon={<ChevronUp className="h-4 w-4 text-primary" />}
            trend={undefined}
          />
        </div>

        {/* Subscription Details Table (LIVE) */}
        <div className="mt-8">
          <SubscriptionDetailsTable />
        </div>

        {/* Charts and Tables */}
        <div className="grid gap-6 lg:grid-cols-2">
          <UsersChart />
          <RecentTransactions />
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Index
