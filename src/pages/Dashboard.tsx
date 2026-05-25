import { trpc } from "@/providers/trpc";
import {
  Package,
  Share2,
  Bot,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  ShoppingCart,
  Globe,
} from "lucide-react";

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { data: productStats } = trpc.product.stats.useQuery();
  const { data: postStats } = trpc.post.stats.useQuery();
  const { data: agentStatus } = trpc.agent.status.useQuery();
  const { data: agentStats } = trpc.agent.stats.useQuery();
  const { data: platformStats } = trpc.post.statsByPlatform.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Overview of your AliExpress + Amazon auto-publishing agent
        </p>
      </div>

      {/* Agent Status Banner */}
      <div
        className={`rounded-xl border p-4 ${
          agentStatus?.isRunning
            ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
            : "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
        }`}
      >
        <div className="flex items-center gap-3">
          {agentStatus?.isRunning ? (
            <Zap className="h-5 w-5 text-green-600 dark:text-green-400" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          )}
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              Agent is {agentStatus?.isRunning ? "Running" : "Stopped"}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {agentStatus?.isRunning
                ? "Automatically finding and posting products from AliExpress & Amazon every 15 minutes"
                : "Enable the agent in settings to start auto-publishing"}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={productStats?.total ?? 0}
          icon={Package}
          color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
          subtitle={`${productStats?.new ?? 0} new, ${productStats?.posted ?? 0} posted`}
        />
        <StatCard
          title="Total Posts"
          value={postStats?.total ?? 0}
          icon={Share2}
          color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
          subtitle={`${postStats?.published ?? 0} published, ${postStats?.failed ?? 0} failed`}
        />
        <StatCard
          title="Agent Runs"
          value={agentStats?.totalRuns ?? 0}
          icon={Bot}
          color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
          subtitle={`${agentStats?.successfulRuns ?? 0} successful`}
        />
        <StatCard
          title="Products Posted"
          value={agentStats?.totalProductsPosted ?? 0}
          icon={TrendingUp}
          color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
          subtitle={`${agentStats?.totalProductsFound ?? 0} found total`}
        />
      </div>

      {/* Source Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <ShoppingCart className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">AliExpress</p>
              <p className="text-xs text-gray-500">{productStats?.aliexpress ?? 0} products</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all"
              style={{
                width: productStats?.total
                  ? `${((productStats.aliexpress ?? 0) / productStats.total) * 100}%`
                  : "0%",
              }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Globe className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Amazon</p>
              <p className="text-xs text-gray-500">{productStats?.amazon ?? 0} products</p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{
                width: productStats?.total
                  ? `${((productStats.amazon ?? 0) / productStats.total) * 100}%`
                  : "0%",
              }}
            />
          </div>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Platform Statistics
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Post distribution across social networks
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {platformStats?.map((platform) => (
              <div
                key={platform.platform}
                className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white capitalize">
                    {platform.platform}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      {platform.published}
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      {platform.failed}
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Clock className="h-4 w-4" />
                      {platform.total}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Latest Agent Run</h2>
        </div>
        <div className="p-6">
          {agentStatus?.latestRun ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    agentStatus.latestRun.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : agentStatus.latestRun.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {agentStatus.latestRun.status}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Started</span>
                <span className="text-sm font-medium">
                  {new Date(agentStatus.latestRun.startedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Products Found</span>
                <span className="text-sm font-medium">
                  {agentStatus.latestRun.productsFound ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Products Posted</span>
                <span className="text-sm font-medium">
                  {agentStatus.latestRun.productsPosted ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Errors</span>
                <span className="text-sm font-medium">
                  {agentStatus.latestRun.errorsCount ?? 0}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Triggered By</span>
                <span className="text-sm font-medium capitalize">
                  {agentStatus.latestRun.triggeredBy}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No agent runs yet. Start the agent to see activity.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
