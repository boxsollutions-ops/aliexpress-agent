import { useState, useMemo } from "react";
import { trpc } from "@/providers/trpc";
import {
  Share2,
  ExternalLink,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Filter,
  Package,
} from "lucide-react";

type StatusFilter = "all" | "pending" | "published" | "failed" | "scheduled";
type PlatformFilter = "all" | "pinterest" | "linkedin" | "telegram";

const statusIcons: Record<string, React.ElementType> = {
  pending: Clock,
  published: CheckCircle,
  failed: XCircle,
  scheduled: Clock,
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  published: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  scheduled: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const platformColors: Record<string, string> = {
  pinterest: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  linkedin: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  telegram: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
};

export default function Posts() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>("all");

  const { data: posts, isLoading, refetch } = trpc.post.list.useQuery();
  const { data: products } = trpc.product.list.useQuery();
  const { data: stats } = trpc.post.stats.useQuery();

  // Create a product lookup map
  const productMap = useMemo(() => {
    const map = new Map<number, { title: string; price: string | null; imageUrl: string | null }>();
    products?.forEach((p) => {
      map.set(p.id, {
        title: p.title,
        price: p.price,
        imageUrl: p.imageUrl,
      });
    });
    return map;
  }, [products]);

  const filteredPosts = posts?.filter((post) => {
    const matchStatus = statusFilter === "all" || post.status === statusFilter;
    const matchPlatform = platformFilter === "all" || post.platform === platformFilter;
    return matchStatus && matchPlatform;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Posts</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track posts published to social networks
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(["all", "pending", "published", "failed"] as StatusFilter[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              statusFilter === status
                ? "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"
                : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{status}</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {status === "all" ? stats?.total ?? 0 : stats?.[status] ?? 0}
            </p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Platform:</span>
          <div className="flex gap-2">
            {(["all", "pinterest", "linkedin", "telegram"] as PlatformFilter[]).map((platform) => (
              <button
                key={platform}
                onClick={() => setPlatformFilter(platform)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                  platformFilter === platform
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {platform}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Posts List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : filteredPosts && filteredPosts.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
                <tr>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Platform</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPosts.map((post) => {
                  const StatusIcon = statusIcons[post.status] ?? Clock;
                  const product = productMap.get(post.productId);
                  return (
                    <tr
                      key={post.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                            {product?.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <Package className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white line-clamp-1 max-w-xs">
                              {product?.title ?? `Product #${post.productId}`}
                            </p>
                            {product?.price && (
                              <p className="text-xs text-gray-500">
                                ${product.price}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                            platformColors[post.platform]
                          }`}
                        >
                          {post.platform}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[post.status]}`}
                        >
                          <StatusIcon className="h-3 w-3" />
                          {post.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {post.publishedAt
                          ? new Date(post.publishedAt).toLocaleDateString()
                          : post.scheduledAt
                            ? new Date(post.scheduledAt).toLocaleDateString()
                            : new Date(post.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {post.postUrl && (
                            <a
                              href={post.postUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                              title="View post"
                            >
                              <ExternalLink className="h-4 w-4 text-blue-600" />
                            </a>
                          )}
                          {post.errorMessage && (
                            <span
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-help"
                              title={post.errorMessage}
                            >
                              <AlertCircle className="h-4 w-4 text-red-500" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-xl border">
          <Share2 className="h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {statusFilter === "all" && platformFilter === "all"
              ? "No posts yet. Start the agent to publish products."
              : "No posts match the selected filters."}
          </p>
        </div>
      )}
    </div>
  );
}
