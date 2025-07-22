import { useSubscribers } from "@/hooks/useSubscribers";
import { usePaymentMonitor } from "@/hooks/usePaymentMonitor";
import { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { parseISO, isAfter, isBefore, isSameDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

interface FilterState {
  status: string;
  plan: string;
  paymentStatus: string;
  authMethod: string;
}

export function SubscriptionDetailsTable() {
  const { subscribers, loading } = useSubscribers();
  const { payments } = usePaymentMonitor(1000);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  useEffect(() => {
    async function fetchSubs() {
      const { data } = await supabase
        .from('user_subscriptions')
        .select('id, user_id, plan_id, status, start_date, end_date, created_at, plan:subscription_plans(name, price, duration_days)')
        .order('created_at', { ascending: false });
      setSubscriptions(data || []);
    }
    fetchSubs();
  }, []);

  const enrichedSubscriptions = useMemo(() => {
    return subscriptions.map(sub => {
      const user = subscribers.find(u => u.id === sub.user_id) || {};
      const payment = payments.find(p => p.user_id === sub.user_id && p.plan_id === sub.plan_id && (p.status === 'paid' || p.status === 'captured'));
      return {
        ...sub,
        user,
        payment,
        isVerified: !!payment,
        amount: payment ? payment.amount / 100 : (sub.plan?.price || 0),
        paymentMethod: 'Razorpay',
        paymentStatus: payment ? payment.status : (sub.status === 'active' ? 'Active' : 'Inactive'),
      };
    });
  }, [subscriptions, payments, subscribers]);

  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    plan: "all",
    paymentStatus: "all",
    authMethod: "all"
  });
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedSubscriber, setSelectedSubscriber] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filteredSubscribers = useMemo(() => {
    let result = enrichedSubscriptions;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(subscriber => {
        const userMatch =
          subscriber.user.email?.toLowerCase().includes(query) ||
          subscriber.user.name?.toLowerCase().includes(query) ||
          subscriber.user.phone?.toLowerCase().includes(query) ||
          subscriber.user.id.toLowerCase().includes(query);
        const userPayments = payments.filter(p =>
          p.user_id === subscriber.user_id
        );
        const paymentMatch = userPayments.some(payment =>
          payment.razorpay_payment_id?.toLowerCase().includes(query) ||
          payment.razorpay_order_id?.toLowerCase().includes(query) ||
          payment.plan_id?.toLowerCase().includes(query) ||
          payment.status?.toLowerCase().includes(query)
        );
        return userMatch || paymentMatch;
      });
    }
    if (filters.status !== "all") {
      result = result.filter(subscriber => {
        if (filters.status === "active") return subscriber.status === "active";
        if (filters.status === "inactive") return subscriber.status === "inactive";
        return true;
      });
    }
    if (filters.plan !== "all") {
      result = result.filter(subscriber => {
        if (filters.plan === "premium") return subscriber.plan?.name === "Monthly Plan";
        if (filters.plan === "free") return subscriber.plan?.name === "Mini Plan";
        return true;
      });
    }
    if (filters.authMethod !== "all") {
      result = result.filter(subscriber =>
        subscriber.user.auth_method === filters.authMethod
      );
    }
    if (filters.paymentStatus !== "all") {
      result = result.filter(subscriber => {
        const userPayments = payments.filter(p =>
          p.user_id === subscriber.user_id
        );
        if (userPayments.length === 0) return filters.paymentStatus === "none";
        return userPayments.some(p => p.status === filters.paymentStatus);
      });
    }
    if (dateRange.from && dateRange.to) {
      result = result.filter(subscriber => {
        const date = subscriber.start_date ? parseISO(subscriber.start_date) : undefined;
        if (!date) return false;
        return (
          (isSameDay(date, dateRange.from) || isAfter(date, dateRange.from)) &&
          (isSameDay(date, dateRange.to) || isBefore(date, dateRange.to))
        );
      });
    }
    return result;
  }, [enrichedSubscriptions, payments, searchQuery, filters, dateRange]);

  return (
    <Card className="mt-8">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-white">Subscription Details</CardTitle>
            <CardDescription>
              View and manage all user subscriptions • Search by email, phone, transaction ID, or payment status
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, phone, transaction ID..."
                className="pl-8 w-80"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-accent/20" : ""}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            {(searchQuery || Object.values(filters).some(f => f !== "all") || dateRange.from || dateRange.to) && (
              <Button variant="outline" size="sm" onClick={() => {
                setSearchQuery("");
                setFilters({ status: "all", plan: "all", paymentStatus: "all", authMethod: "all" });
                setDateRange({});
                setShowCalendar(false);
              }}>
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4 p-4 bg-gray-800/50 rounded-lg border">
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Subscription Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({...prev, status: value}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Plan Type</label>
              <Select value={filters.plan} onValueChange={(value) => setFilters(prev => ({...prev, plan: value}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Auth Method</label>
              <Select value={filters.authMethod} onValueChange={(value) => setFilters(prev => ({...prev, authMethod: value}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="google">Google OAuth</SelectItem>
                  <SelectItem value="otp">Phone OTP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Payment Status</label>
              <Select value={filters.paymentStatus} onValueChange={(value) => setFilters(prev => ({...prev, paymentStatus: value}))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="none">No Payments</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-gray-300 mb-2 block">Date Range</label>
              <button
                className="w-full border rounded px-3 py-2 bg-background text-left text-sm"
                onClick={() => setShowCalendar((v) => !v)}
              >
                {dateRange.from && dateRange.to
                  ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                  : "Select range"}
              </button>
              {showCalendar && (
                <div className="absolute z-50 mt-2 bg-background border rounded shadow-lg">
                  <Calendar
                    mode="range"
                    selected={dateRange as any}
                    onSelect={(range) => {
                      setDateRange(range || {});
                      setShowCalendar(false);
                    }}
                    numberOfMonths={2}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading subscriptions…</p>
        ) : filteredSubscribers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">
              {searchQuery || Object.values(filters).some(f => f !== "all") || dateRange.from || dateRange.to
                ? "No subscriptions found matching your search criteria."
                : "No subscriptions found."
              }
            </p>
            {(searchQuery || Object.values(filters).some(f => f !== "all") || dateRange.from || dateRange.to) && (
              <Button variant="outline" size="sm" onClick={() => {
                setSearchQuery("");
                setFilters({ status: "all", plan: "all", paymentStatus: "all", authMethod: "all" });
                setDateRange({});
                setShowCalendar(false);
              }} className="mt-2">
                Clear Search & Filters
              </Button>
            )}
          </div>
        ) :
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Billing</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscribers.map((sub) => {
                const nextBilling = sub.end_date ? new Date(sub.end_date).toLocaleDateString() : "—";
                return (
                  <TableRow key={sub.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium text-white">{sub.user.email || "—"}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          {sub.user.phone && <span>📱 {sub.user.phone}</span>}
                          <Badge variant="outline" className="text-xs">
                            {sub.user.auth_method === 'google' ? 'Google' : 'OTP'}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-white">
                      <div>
                        {sub.plan?.name ?? "—"}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-white">
                      {formatCurrency(sub.amount)}
                    </TableCell>
                    <TableCell>
                      {sub.paymentMethod}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={sub.status === 'active' ? "default" : "destructive"}>
                          {sub.status === 'active' ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {sub.paymentStatus}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-white">{nextBilling}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => { setSelectedSubscriber(sub.user); setDialogOpen(true); }}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        }
      </CardContent>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl w-[95vw] rounded-2xl shadow-2xl bg-[#18181b]/95 border border-border p-0 overflow-hidden">
          <DialogHeader className="border-b px-8 pt-7 pb-3 bg-[#232326]">
            <DialogTitle className="text-2xl font-bold text-white mb-1">यूज़र पेमेंट डिटेल्स</DialogTitle>
            <DialogDescription className="text-muted-foreground text-lg">
              {selectedSubscriber ? (
                <div className="mb-2 space-y-1">
                  <div><span className="font-semibold">ईमेल:</span> {selectedSubscriber.email}</div>
                  {selectedSubscriber.phone && (<div><span className="font-semibold">फोन:</span> {selectedSubscriber.phone}</div>)}
                  <div><span className="font-semibold">प्लान:</span> {selectedSubscriber.subscription_tier}</div>
                  <div><span className="font-semibold">कुल पेमेंट्स:</span> {payments.filter(p => p.user_id === selectedSubscriber.id).length}</div>
                </div>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <div className="px-0 py-6 bg-[#18181b]">
            {selectedSubscriber && (() => {
              const userPayments = payments.filter(p => p.user_id === selectedSubscriber.id);
              if (userPayments.length === 0) return <div className="text-center py-8 text-muted-foreground">कोई पेमेंट रिकॉर्ड नहीं मिला।</div>;
              return (
                <div className="overflow-x-auto px-6">
                  <table className="min-w-[900px] w-full text-base rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-[#232326] text-white border-b border-border">
                        <th className="p-4 text-left font-bold whitespace-nowrap min-w-[80px]">राशि</th>
                        <th className="p-4 text-left font-bold whitespace-nowrap min-w-[120px]">पेमेंट मेथड</th>
                        <th className="p-4 text-center font-bold whitespace-nowrap min-w-[120px]">स्टेटस</th>
                        <th className="p-4 text-left font-bold whitespace-nowrap min-w-[180px]">तारीख</th>
                        <th className="p-4 text-left font-bold whitespace-nowrap min-w-[220px]">Razorpay Payment ID</th>
                        <th className="p-4 text-left font-bold whitespace-nowrap min-w-[220px]">Order ID</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userPayments.map((p, idx) => (
                        <tr key={p.id} className={idx % 2 === 0 ? "bg-[#18181b]" : "bg-[#222226]"}>
                          <td className="p-4 font-semibold text-white whitespace-nowrap">₹{(p.amount ?? 0) / 100}</td>
                          <td className="p-4 whitespace-nowrap">{p.payment_method || "—"}</td>
                          <td className="p-4 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${p.status === 'paid' || p.status === 'completed' ? 'bg-green-600/20 text-green-400 border border-green-700' : 'bg-yellow-600/20 text-yellow-400 border border-yellow-700'}`}>{p.status}</span>
                          </td>
                          <td className="p-4 whitespace-nowrap">{new Date(p.created_at).toLocaleString()}</td>
                          <td className="p-4 font-mono text-xs break-all whitespace-pre-line">{p.razorpay_payment_id || "—"}</td>
                          <td className="p-4 font-mono text-xs break-all whitespace-pre-line">{p.razorpay_order_id || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
          <div className="px-8 pb-7 pt-3 bg-[#18181b]">
            <DialogClose asChild>
              <Button variant="outline" className="w-full text-lg py-3">बंद करें</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 