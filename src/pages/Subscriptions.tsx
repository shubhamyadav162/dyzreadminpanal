import { DashboardLayout } from "@/components/DashboardLayout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Download, Star, TrendingUp, X } from "lucide-react"
import { useSubscribers } from "@/hooks/useSubscribers"
import { usePaymentMonitor } from "@/hooks/usePaymentMonitor"
import { useState, useMemo, useCallback, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client"
import { Calendar } from "@/components/ui/calendar";
import { addDays, isAfter, isBefore, isSameDay, parseISO } from "date-fns";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

// Updated subscription plans as per new pricing
const currentPlans = [
  { name: "Mini Plan", price: 99, duration: "3 days", perDay: 33, popular: false },
  { name: "Quick Plan", price: 149, duration: "15 days", perDay: 10, popular: false },
  { name: "Monthly Plan", price: 249, duration: "30 days", perDay: 8, popular: true },
  { name: "3 Month Plan", price: 449, duration: "90 days", perDay: 5, popular: false },
  { name: "6 Month Plan", price: 649, duration: "180 days", perDay: 4, popular: false },
  { name: "Yearly Plan", price: 1299, duration: "365 days", perDay: 4, popular: false },
];

interface FilterState {
  status: string;
  plan: string;
  paymentStatus: string;
  authMethod: string;
}

export default function Subscriptions() {
  const { subscribers, loading } = useSubscribers();
  const { payments } = usePaymentMonitor(1000); // Get more payments for search

  // Fetch subscriptions and plan info for fallback
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

  // Merge subscriptions with payments and subscribers
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
        paymentMethod: 'Razorpay', // Always Razorpay
        paymentStatus: payment ? payment.status : (sub.status === 'active' ? 'Active' : 'Inactive'),
      };
    });
  }, [subscriptions, payments, subscribers]);

  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: "all",
    plan: "all", 
    paymentStatus: "all",
    authMethod: "all"
  });

  const [selectedSubscriber, setSelectedSubscriber] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [showCalendar, setShowCalendar] = useState(false);

  // Enhanced search functionality
  const filteredSubscribers = useMemo(() => {
    let result = enrichedSubscriptions;

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(subscriber => {
        // Search in user details
        const userMatch = 
          subscriber.user.email?.toLowerCase().includes(query) ||
          subscriber.user.name?.toLowerCase().includes(query) ||
          subscriber.user.phone?.toLowerCase().includes(query) ||
          subscriber.user.id.toLowerCase().includes(query);

        // Search in payment data for this user
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

    // Apply filters
    if (filters.status !== "all") {
      result = result.filter(subscriber => {
        if (filters.status === "active") return subscriber.status === "active";
        if (filters.status === "inactive") return subscriber.status === "inactive";
        return true;
      });
    }

    if (filters.plan !== "all") {
      result = result.filter(subscriber => {
        if (filters.plan === "premium") return subscriber.plan?.name === "Monthly Plan"; // Assuming "Monthly Plan" is the premium one
        if (filters.plan === "free") return subscriber.plan?.name === "Mini Plan"; // Assuming "Mini Plan" is the free one
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

    // Date range filter
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

  // Enhanced subscriber data with payment information
  const enrichedSubscribers = useMemo(() => {
    return filteredSubscribers.map(subscriber => {
      const userPayments = payments.filter(p => 
        p.user_id === subscriber.user_id
      );
      
      const latestPayment = userPayments.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )[0];

      return {
        ...subscriber,
        latestPayment,
        totalPayments: userPayments.length,
        totalAmount: userPayments.reduce((sum, p) => sum + p.amount, 0) / 100 // Convert to rupees
      };
    });
  }, [filteredSubscribers, payments]);

  // Export to CSV functionality
  const exportToCSV = useCallback(() => {
    const headers = [
      "User Email",
      "Name", 
      "Phone",
      "Plan",
      "Status",
      "Auth Method",
      "Subscription End",
      "Total Payments",
      "Total Amount (₹)",
      "Latest Payment ID",
      "Latest Payment Status",
      "Created Date"
    ];

    const csvData = enrichedSubscribers.map(sub => [
      sub.email || "",
      sub.name || "",
      sub.phone || "",
      sub.subscription_tier || "",
      sub.is_active ? "Active" : "Inactive",
      sub.auth_method || "",
      sub.subscription_end ? new Date(sub.subscription_end).toLocaleDateString() : "",
      sub.totalPayments.toString(),
      sub.totalAmount.toString(),
      sub.latestPayment?.razorpay_payment_id || "",
      sub.latestPayment?.status || "",
      new Date(sub.created_at).toLocaleDateString()
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `subscriptions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [enrichedSubscribers]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setFilters({
      status: "all",
      plan: "all",
      paymentStatus: "all", 
      authMethod: "all"
    });
    setShowFilters(false);
    setDateRange({}); // Clear date range
    setShowCalendar(false); // Hide calendar
  };

  const totalSubscriptions = subscribers.length;
  const activeSubs = subscribers.filter(
    (s) => s.is_active && (s.subscription_end ? new Date(s.subscription_end) > new Date() : false)
  ).length;

  // Monthly revenue – sum of paid payments in current month
  const monthlyRevenue = payments
    .filter((p) => {
      if (p.status !== "paid") return false;
      const created = new Date(p.created_at);
      const now = new Date();
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    })
    .reduce((acc, p) => acc + p.amount, 0) / 100; // convert to rupees

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Subscriptions</h1>
            <p className="text-muted-foreground mt-2">Manage user subscriptions and billing</p>
          </div>
          <Button onClick={exportToCSV} className="bg-accent hover:bg-accent/90">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>

        {/* Current Subscription Plans Overview */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-white flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Current Subscription Plans
                </CardTitle>
                <CardDescription>Active pricing structure - simplified and attractive</CardDescription>
              </div>
              <Badge variant="secondary">6 Active Plans</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentPlans.map((plan, index) => (
                <div 
                  key={index} 
                  className={`relative p-4 rounded-lg border ${
                    plan.popular 
                      ? 'border-red-500 bg-red-500/10' 
                      : 'border-gray-700 bg-gray-800/50'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-2 left-4 px-2 py-1 bg-red-500 text-white text-xs rounded">
                      <Star className="w-3 h-3 inline mr-1" />
                      Most Popular
                    </div>
                  )}
                  <div className="space-y-2">
                    <h3 className="font-semibold text-white">{plan.name}</h3>
                    <div className="text-2xl font-bold text-red-500">
                      {formatCurrency(plan.price)}
                    </div>
                    <div className="text-sm text-gray-400">
                      {plan.duration} • ₹{plan.perDay}/day
                    </div>
                    <div className="text-xs text-gray-500">
                      Simple pricing, no technical jargon
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-sm text-green-400">
                ✅ All plans include: सभी Web Series, HD Quality, Downloads, No Ads, No Password Sharing
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Subscriptions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{totalSubscriptions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{activeSubs}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(monthlyRevenue)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Filtered Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{filteredSubscribers.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Details Table */}
        <Card>
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
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
            
            {/* Filter Panel */}
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
                        selected={dateRange}
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
                  <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2">
                    Clear Search & Filters
                  </Button>
                )}
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
        {/* Total Earned Section */}
        <div className="flex justify-end mt-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg px-6 py-4 text-right">
            <div className="text-lg font-semibold text-white">Total Earned</div>
            <div className="text-2xl font-bold text-green-400 mt-1">
              {formatCurrency(filteredSubscribers.reduce((sum, sub) => sum + (sub.amount || 0), 0))}
            </div>
          </div>
        </div>
      </div>

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
                  <div><span className="font-semibold">कुल पेमेंट्स:</span> {selectedSubscriber.totalPayments}</div>
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
    </DashboardLayout>
  )
}
