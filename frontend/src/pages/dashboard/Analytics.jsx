import { useState, useEffect } from "react";
import { BarChart3, Wifi, Users, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import AnalyticsChart from "../../components/AnalyticsChart";
import DateRangePicker from "../../components/DateRangePicker";
import Badge from "../../components/Badge";
import Card, {
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../../components/Card";
import useAuthStore from "../../stores/authStore";
import api from "../../utils/api";
import { formatCurrency } from "../../utils/formatters";
import { toast } from "react-hot-toast";

const Analytics = () => {
  const { user } = useAuthStore();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [dateFilter, setDateFilter] = useState("today");
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [analyticsRes, purchasesRes] = await Promise.all([
        api.get(`/get-analytics?date=${dateFilter}`),
        api.get(`/get-purchase-list?date=${dateFilter}&limit=100`),
      ]);
      setAnalyticsData(analyticsRes.data);
      setPurchases(purchasesRes.data.purchases || []);
    } catch (error) {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (range) => {
    setDateFilter(range.preset || "today");
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateFilter]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-dark-800/50 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-dark-800/50 rounded-xl animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-72 bg-dark-800/50 rounded-xl animate-pulse" />
          <div className="h-72 bg-dark-800/50 rounded-xl animate-pulse" />
        </div>
        <div className="h-96 bg-dark-800/50 rounded-xl animate-pulse" />
      </div>
    );
  }


  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <BarChart3 className="w-9 h-9 text-primary-500 bg-primary-600/10 p-2 rounded-xl" />
          <div>
            <h1 className="text-3xl font-bold text-white">Analytics</h1>
            <p className="text-dark-400 text-lg">
              {dateFilter.toUpperCase()} — {purchases.length} data purchases
            </p>
          </div>
        </div>
        <DateRangePicker
          value={{ preset: dateFilter }}
          onChange={handleDateChange}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
            <CardDescription>Daily data sales trend</CardDescription>
          </CardHeader>
          <CardContent>
            <AnalyticsChart
              type="line"
              data={analyticsData?.revenue?.daily || []}
              categories={["data_sales", "wallet_funds"]}
              height={350}
            />
          </CardContent>
        </Card>

      </div>

      {/* Network Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Network Sales</CardTitle>
          <CardDescription>Popular networks</CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <AnalyticsChart
            type="pie"
            data={(analyticsData?.network_analytics || []).map((n) => ({
              name: n.network,
              value: n.purchase_count,
            }))}
            height={350}
          />
        </CardContent>
      </Card>

      {/* Purchases Table */}
      <Card>
        <CardHeader className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <CardTitle>Data Purchases ({purchases.length})</CardTitle>
            <CardDescription>Sender &amp; recipient details</CardDescription>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  purchases
                    .map(
                      (p) =>
                        `Phone: ${p.phone} | Ref: ${
                          p.reference
                        } | ${formatCurrency(p.amount)} | ${p.network}`
                    )
                    .join("\n\n")
                );
                toast.success(`Copied ${purchases.length} recipient details!`);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-xl font-medium transition-all border border-green-500/20"
            >
              📋 Copy All Recipient Numbers + Receipts
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  purchases.map((p) => p.phone).join("\n")
                );
                toast.success("Recipient phones copied!");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl font-medium transition-all border border-blue-500/20"
            >
              📱 Phones Only
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {purchases.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-dark-800 bg-dark-900/50">
                    <th className="text-left p-4 font-semibold text-white/80">
                      Sender
                    </th>
                    <th className="text-left p-4 font-semibold text-white/80">
                      Recipient Phone
                    </th>
                    <th className="text-left p-3 font-semibold text-white/80">
                      Ref
                    </th>
                    <th className="text-left p-3 font-semibold text-white/80">
                      Network
                    </th>
                    <th className="text-right p-4 font-semibold text-white/80">
                      Amount
                    </th>
                    <th className="text-left p-3 font-semibold text-white/80">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-dark-800/50 hover:bg-dark-800/30"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-sm">
                          {p.user_name}
                        </div>
                        <div className="text-xs text-dark-400">{p.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-xl font-bold text-primary-400">
                          {p.phone}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-mono text-xs bg-dark-800/50 px-2 py-1 rounded">
                          {p.reference}
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge className="px-2 py-1">{p.network}</Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="text-lg font-bold text-green-400">
                          {formatCurrency(p.amount)}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-dark-400">
                        {new Date(p.date).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <Wifi className="w-16 h-16 text-dark-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-dark-300 mb-2">
                No data purchases {dateFilter}
              </h3>
              <p className="text-dark-500 mb-6">Try changing the date range</p>
              <DateRangePicker
                value={{ preset: dateFilter }}
                onChange={handleDateChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profit Breakdown */}
      {(() => {
        const summary = analyticsData?.revenue?.summary || {};
        const revenue = summary.total_revenue || 0;
        const cost = summary.total_cost || 0;
        const profit = summary.total_profit || 0;
        const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : "0.0";
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white">Profit Breakdown</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Revenue */}
              <div className="bg-dark-900/80 border border-dark-800 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5 text-blue-400" />
                  </div>
                  <p className="text-dark-400 text-xs uppercase tracking-wider">Total Revenue</p>
                </div>
                <p className="text-3xl font-bold text-white">{formatCurrency(revenue, true)}</p>
                <p className="text-dark-500 text-xs mt-1">From {summary.total_transactions || 0} data orders · {dateFilter}</p>
              </div>

              {/* Cost — total sent/used from 1Papi account */}
              <div className="bg-dark-900/80 border border-red-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-red-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  </div>
                  <p className="text-dark-400 text-xs uppercase tracking-wider">Deposited to Provider</p>
                </div>
                <p className="text-3xl font-bold text-red-400">{formatCurrency(cost, true)}</p>
                <p className="text-dark-500 text-xs mt-1">Deducted from 1Papi balance · {dateFilter}</p>
              </div>

              {/* Profit */}
              <div className="bg-dark-900/80 border border-green-500/20 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-dark-400 text-xs uppercase tracking-wider">Net Profit</p>
                </div>
                <p className="text-3xl font-bold text-green-400">{formatCurrency(profit, true)}</p>
                <p className="text-dark-500 text-xs mt-1">{margin}% margin · {dateFilter}</p>
              </div>
            </div>

            {/* Wallet Deposits row */}
            <div className="bg-dark-900/50 border border-dark-800 rounded-xl px-5 py-3 flex items-center justify-between">
              <p className="text-dark-400 text-sm">Total Wallet Top-ups (registered users deposited into your platform)</p>
              <p className="text-white font-bold">{formatCurrency(summary.total_wallet_funds || 0, true)}</p>
            </div>
          </div>
        );
      })()}

      {/* Purchases Count + Users */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">Data Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">{purchases.length}</div>
            <p className="text-sm text-dark-400 mt-1">{dateFilter}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl">Registered Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-white">
              {analyticsData?.platform_stats?.total_users || 0}
            </div>
            <p className="text-sm text-dark-400 mt-1">All time</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
