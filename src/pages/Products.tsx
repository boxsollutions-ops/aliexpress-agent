import { useState } from "react";
import { trpc } from "@/providers/trpc";
import {
  Package,
  ExternalLink,
  Star,
  ShoppingCart,
  Tag,
  Filter,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Globe,
  ShoppingBag,
} from "lucide-react";

type StatusFilter = "all" | "new" | "processed" | "posted" | "skipped" | "error";
type SourceFilter = "all" | "aliexpress" | "amazon";

const statusIcons: Record<string, React.ElementType> = {
  new: Clock,
  processed: CheckCircle,
  posted: CheckCircle,
  skipped: XCircle,
  error: AlertCircle,
};

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  processed: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  posted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  skipped: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400",
  error: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const sourceIcons: Record<string, React.ElementType> = {
  aliexpress: ShoppingBag,
  amazon: Globe,
};

const sourceColors: Record<string, string> = {
  aliexpress: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  amazon: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

export default function Products() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const { data: products, isLoading, refetch } = trpc.product.list.useQuery();
  const { data: stats } = trpc.product.stats.useQuery();

  const filteredProducts = products?.filter((p) => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchSource = sourceFilter === "all" || p.source === sourceFilter;
    return matchStatus && matchSource;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage products from AliExpress & Amazon
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
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["all", "new", "processed", "posted", "error"] as StatusFilter[]).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`p-3 rounded-lg border text-left transition-colors ${
              statusFilter === status
                ? "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800"
                : "bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
              {status === "all" ? "All" : status}
            </p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">
              {status === "all"
                ? stats?.total ?? 0
                : stats?.[status] ?? 0}
            </p>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600 dark:text-gray-400">Source:</span>
          <div className="flex gap-2">
            {(["all", "aliexpress", "amazon"] as SourceFilter[]).map((source) => (
              <button
                key={source}
                onClick={() => setSourceFilter(source)}
                className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                  sourceFilter === source
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {source === "all" ? "All Sources" : source}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : filteredProducts && filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const StatusIcon = statusIcons[product.status] ?? Clock;
            const SourceIcon = sourceIcons[product.source] ?? Package;
            return (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative overflow-hidden">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://placehold.co/400x225?text=${encodeURIComponent(product.title.slice(0, 20))}`;
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[product.status]}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {product.status}
                    </span>
                  </div>
                  {/* Source badge */}
                  <div className="absolute top-2 left-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${sourceColors[product.source]}`}
                    >
                      <SourceIcon className="h-3 w-3" />
                      {product.source}
                    </span>
                  </div>
                  {product.isTrending && (
                    <div className="absolute bottom-2 left-2">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        Trending
                      </span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2 text-sm">
                    {product.title}
                  </h3>

                  <div className="mt-3 flex items-center gap-4 text-sm">
                    {product.price && (
                      <span className="font-semibold text-orange-600">
                        ${product.price}
                        {product.originalPrice && (
                          <span className="ml-1 text-xs text-gray-400 line-through">
                            ${product.originalPrice}
                          </span>
                        )}
                      </span>
                    )}
                    {product.rating && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <Star className="h-4 w-4 fill-current" />
                        {product.rating}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {product.ordersCount !== null && product.ordersCount !== undefined && (
                      <span className="flex items-center gap-1">
                        <ShoppingCart className="h-3 w-3" />
                        {product.ordersCount.toLocaleString()} orders
                      </span>
                    )}
                    {product.category && (
                      <span className="flex items-center gap-1">
                        <Tag className="h-3 w-3" />
                        {product.category}
                      </span>
                    )}
                  </div>

                  {product.referralUrl && (
                    <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <p className="text-xs text-green-700 dark:text-green-400 font-medium">
                        Referral link added ({product.source})
                      </p>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t flex items-center justify-between">
                    <a
                      href={product.productUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View on {product.source === "amazon" ? "Amazon" : "AliExpress"}
                    </a>
                    <span className="text-xs text-gray-400">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-xl border">
          <Package className="h-12 w-12 text-gray-300" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            {statusFilter === "all" && sourceFilter === "all"
              ? "No products found yet. Start the agent to find products."
              : `No products match the selected filters.`}
          </p>
        </div>
      )}
    </div>
  );
}
