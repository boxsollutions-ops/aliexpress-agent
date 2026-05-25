import { useState } from "react";
import { trpc } from "@/providers/trpc";
import {
  Bot,
  Play,
  Square,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Package,
  Share2,
} from "lucide-react";

export default function AgentPage() {
  const [isActionLoading, setIsActionLoading] = useState(false);

  const utils = trpc.useUtils();
  const { data: agentStatus, refetch: refetchStatus } = trpc.agent.status.useQuery();
  const { data: agentRuns, refetch: refetchRuns } = trpc.agent.runs.useQuery({ limit: 20 });
  const { data: agentStats } = trpc.agent.stats.useQuery();

  const startAgent = trpc.agent.start.useMutation({
    onSuccess: () => {
      utils.agent.status.invalidate();
      utils.agent.runs.invalidate();
      utils.agent.stats.invalidate();
    },
  });

  const stopAgent = trpc.agent.stop.useMutation({
    onSuccess: () => {
      utils.agent.status.invalidate();
      utils.agent.runs.invalidate();
      utils.agent.stats.invalidate();
    },
  });

  const runOnce = trpc.agent.runOnce.useMutation({
    onSuccess: () => {
      utils.agent.status.invalidate();
      utils.agent.runs.invalidate();
      utils.agent.stats.invalidate();
      utils.product.stats.invalidate();
      utils.post.stats.invalidate();
    },
  });

  const handleStart = async () => {
    setIsActionLoading(true);
    await startAgent.mutateAsync();
    setIsActionLoading(false);
  };

  const handleStop = async () => {
    setIsActionLoading(true);
    await stopAgent.mutateAsync();
    setIsActionLoading(false);
  };

  const handleRunOnce = async () => {
    setIsActionLoading(true);
    await runOnce.mutateAsync();
    setIsActionLoading(false);
  };

  const isRunning = agentStatus?.isRunning ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Agent Control</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your auto-publishing agent
        </p>
      </div>

      {/* Status Card */}
      <div
        className={`rounded-xl border p-6 ${
          isRunning
            ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
            : "bg-white dark:bg-gray-800"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-xl ${
                isRunning
                  ? "bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              <Bot className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Agent is {isRunning ? "Running" : "Stopped"}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isRunning
                  ? "Finding and posting products automatically"
                  : "Agent is idle. Start it to begin auto-publishing."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isRunning ? (
              <button
                onClick={handleStop}
                disabled={isActionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
            ) : (
              <button
                onClick={handleStart}
                disabled={isActionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                Start
              </button>
            )}
            <button
              onClick={handleRunOnce}
              disabled={isActionLoading || isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              <Zap className="h-4 w-4" />
              Run Once
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Package className="h-5 w-5 text-blue-700 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Products Found</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {agentStats?.totalProductsFound ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Share2 className="h-5 w-5 text-green-700 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Products Posted</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {agentStats?.totalProductsPosted ?? 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-700 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {agentStats && agentStats.totalRuns > 0
                  ? `${Math.round(
                      (agentStats.successfulRuns / agentStats.totalRuns) * 100
                    )}%`
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Runs History */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm">
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Run History</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Recent agent execution logs
            </p>
          </div>
          <button
            onClick={() => {
              refetchRuns();
              refetchStatus();
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Products</th>
                <th className="px-6 py-3">Posted</th>
                <th className="px-6 py-3">Errors</th>
                <th className="px-6 py-3">Triggered</th>
                <th className="px-6 py-3">Started</th>
                <th className="px-6 py-3">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {agentRuns && agentRuns.length > 0 ? (
                agentRuns.map((run) => {
                  const statusIcon =
                    run.status === "completed" ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : run.status === "failed" ? (
                      <XCircle className="h-4 w-4 text-red-600" />
                    ) : run.status === "running" ? (
                      <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                    );

                  const duration =
                    run.completedAt && run.startedAt
                      ? Math.round(
                          (new Date(run.completedAt).getTime() -
                            new Date(run.startedAt).getTime()) /
                            1000
                        )
                      : null;

                  return (
                    <tr
                      key={run.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium">#{run.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {statusIcon}
                          <span className="capitalize">{run.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">{run.productsFound ?? 0}</td>
                      <td className="px-6 py-4 text-green-600 font-medium">
                        {run.productsPosted ?? 0}
                      </td>
                      <td className="px-6 py-4 text-red-600">
                        {run.errorsCount ?? 0}
                      </td>
                      <td className="px-6 py-4 capitalize">{run.triggeredBy}</td>
                      <td className="px-6 py-4">
                        {new Date(run.startedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        {duration !== null ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {duration}s
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    No agent runs yet. Start the agent to see history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
