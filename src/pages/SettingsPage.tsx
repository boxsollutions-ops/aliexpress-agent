import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import {
  Save,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Timer,
  Hash,
  Star,
  ShoppingBag,
  Bot,
  Globe,
  ShoppingCart,
} from "lucide-react";

interface SettingFormData {
  referralBaseUrl: string;
  amazonReferralUrl: string;
  pinterestAccessToken: string;
  pinterestBoardId: string;
  linkedinAccessToken: string;
  linkedinUserId: string;
  telegramBotToken: string;
  telegramChannelId: string;
  agentEnabled: boolean;
  agentIntervalMinutes: string;
  maxPostsPerDay: string;
  minProductRating: string;
  minOrdersCount: string;
  postTemplate: string;
}

export default function SettingsPage() {
  const utils = trpc.useUtils();
  const { data: settings, isLoading } = trpc.settings.list.useQuery();
  const { data: connectionStatus } = trpc.settings.connectionStatus.useQuery();

  const updateBulk = trpc.settings.updateBulk.useMutation({
    onSuccess: () => {
      utils.settings.list.invalidate();
      utils.settings.connectionStatus.invalidate();
    },
  });

  const [formData, setFormData] = useState<SettingFormData>({
    referralBaseUrl: "",
    amazonReferralUrl: "",
    pinterestAccessToken: "",
    pinterestBoardId: "",
    linkedinAccessToken: "",
    linkedinUserId: "",
    telegramBotToken: "",
    telegramChannelId: "",
    agentEnabled: false,
    agentIntervalMinutes: "15",
    maxPostsPerDay: "96",
    minProductRating: "4.0",
    minOrdersCount: "100",
    postTemplate: "",
  });

  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    if (settings) {
      const getValue = (key: string) => settings.find((s) => s.key === key)?.value ?? "";
      setFormData({
        referralBaseUrl: getValue("referralBaseUrl"),
        amazonReferralUrl: getValue("amazonReferralUrl"),
        pinterestAccessToken: getValue("pinterestAccessToken"),
        pinterestBoardId: getValue("pinterestBoardId"),
        linkedinAccessToken: getValue("linkedinAccessToken"),
        linkedinUserId: getValue("linkedinUserId"),
        telegramBotToken: getValue("telegramBotToken"),
        telegramChannelId: getValue("telegramChannelId"),
        agentEnabled: getValue("agentEnabled") === "true",
        agentIntervalMinutes: getValue("agentIntervalMinutes") || "15",
        maxPostsPerDay: getValue("maxPostsPerDay") || "96",
        minProductRating: getValue("minProductRating") || "4.0",
        minOrdersCount: getValue("minOrdersCount") || "100",
        postTemplate:
          getValue("postTemplate") ||
          `🔥 {title}\n\n💰 Price: {price}\n⭐ Rating: {rating}/5\n🛒 Orders: {orders}\n\n👇 Get it now:\n{referralUrl}`,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    const updates = Object.entries(formData).map(([key, value]) => ({
      key,
      value: typeof value === "boolean" ? String(value) : value,
    }));

    await updateBulk.mutateAsync(updates);
    setSavedMessage("Settings saved successfully!");
    setTimeout(() => setSavedMessage(""), 3000);
  };

  const handleChange = (field: keyof SettingFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure your agent and social media connections
          </p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
        >
          <Save className="h-4 w-4" />
          Save Changes
        </button>
      </div>

      {savedMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle className="h-5 w-5" />
          {savedMessage}
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Connection Status
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {connectionStatus && (
            <>
              <div
                className={`p-4 rounded-lg border ${
                  connectionStatus.pinterest.connected
                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                    : "bg-gray-50 border-gray-200 dark:bg-gray-700/50 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  {connectionStatus.pinterest.connected ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="font-medium">Pinterest</span>
                </div>
              </div>

              <div
                className={`p-4 rounded-lg border ${
                  connectionStatus.linkedin.connected
                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                    : "bg-gray-50 border-gray-200 dark:bg-gray-700/50 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  {connectionStatus.linkedin.connected ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="font-medium">LinkedIn</span>
                </div>
              </div>

              <div
                className={`p-4 rounded-lg border ${
                  connectionStatus.telegram.connected
                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                    : "bg-gray-50 border-gray-200 dark:bg-gray-700/50 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  {connectionStatus.telegram.connected ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="font-medium">Telegram</span>
                </div>
              </div>

              <div
                className={`p-4 rounded-lg border ${
                  connectionStatus.referral.configured
                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                    : "bg-gray-50 border-gray-200 dark:bg-gray-700/50 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  {connectionStatus.referral.configured ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="font-medium">AliExpress Ref</span>
                </div>
              </div>

              <div
                className={`p-4 rounded-lg border ${
                  connectionStatus.amazonReferral?.configured
                    ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                    : "bg-gray-50 border-gray-200 dark:bg-gray-700/50 dark:border-gray-700"
                }`}
              >
                <div className="flex items-center gap-2">
                  {connectionStatus.amazonReferral?.configured ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-gray-400" />
                  )}
                  <span className="font-medium">Amazon Ref</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Agent Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Agent Configuration
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Enable Agent</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Turn on automatic product finding and posting
              </p>
            </div>
            <button
              onClick={() => handleChange("agentEnabled", !formData.agentEnabled)}
              className="transition-colors"
            >
              {formData.agentEnabled ? (
                <ToggleRight className="h-8 w-8 text-green-600" />
              ) : (
                <ToggleLeft className="h-8 w-8 text-gray-400" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Timer className="h-4 w-4" />
                Interval (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                value={formData.agentIntervalMinutes}
                onChange={(e) => handleChange("agentIntervalMinutes", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500">Default: 15 minutes</p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Hash className="h-4 w-4" />
                Max Posts Per Day
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={formData.maxPostsPerDay}
                onChange={(e) => handleChange("maxPostsPerDay", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Star className="h-4 w-4" />
                Min Product Rating
              </label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={formData.minProductRating}
                onChange={(e) => handleChange("minProductRating", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <ShoppingBag className="h-4 w-4" />
                Min Orders Count
              </label>
              <input
                type="number"
                min="0"
                value={formData.minOrdersCount}
                onChange={(e) => handleChange("minOrdersCount", e.target.value)}
                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Referral Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-orange-600" />
            AliExpress Referral
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Base Referral URL
            </label>
            <input
              type="url"
              value={formData.referralBaseUrl}
              onChange={(e) => handleChange("referralBaseUrl", e.target.value)}
              placeholder="https://s.click.aliexpress.com/e/_okL7gE5"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Your AliExpress Portals / Admitad affiliate link.
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Amazon Associates
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Associates Tag / Referral URL
            </label>
            <input
              type="text"
              value={formData.amazonReferralUrl}
              onChange={(e) => handleChange("amazonReferralUrl", e.target.value)}
              placeholder="yourtag-20"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-gray-500">
              Your Amazon Associates tracking ID (e.g., yourtag-20) or full referral URL.
            </p>
          </div>
        </div>
      </div>

      {/* Pinterest */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pinterest</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Access Token
            </label>
            <input
              type="password"
              value={formData.pinterestAccessToken}
              onChange={(e) => handleChange("pinterestAccessToken", e.target.value)}
              placeholder="pina_..."
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Board ID
            </label>
            <input
              type="text"
              value={formData.pinterestBoardId}
              onChange={(e) => handleChange("pinterestBoardId", e.target.value)}
              placeholder="1234567890123456789"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* LinkedIn */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">LinkedIn</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Access Token
            </label>
            <input
              type="password"
              value={formData.linkedinAccessToken}
              onChange={(e) => handleChange("linkedinAccessToken", e.target.value)}
              placeholder="AQXN..."
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User ID (URN)
            </label>
            <input
              type="text"
              value={formData.linkedinUserId}
              onChange={(e) => handleChange("linkedinUserId", e.target.value)}
              placeholder="urn:li:person:xxx"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Telegram */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Telegram</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bot Token
            </label>
            <input
              type="password"
              value={formData.telegramBotToken}
              onChange={(e) => handleChange("telegramBotToken", e.target.value)}
              placeholder="123456:ABC-DEF..."
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Channel ID
            </label>
            <input
              type="text"
              value={formData.telegramChannelId}
              onChange={(e) => handleChange("telegramChannelId", e.target.value)}
              placeholder="@mychannel or -100xxxx"
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Post Template */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Post Template (Telegram)
        </h2>
        <div>
          <textarea
            value={formData.postTemplate}
            onChange={(e) => handleChange("postTemplate", e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {["{title}", "{description}", "{price}", "{rating}", "{orders}", "{referralUrl}"].map(
              (variable) => (
                <span
                  key={variable}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-400"
                >
                  {variable}
                </span>
              )
            )}
          </div>
          <p className="mt-2 text-xs text-gray-500">
            Use these variables in your template. They will be replaced with product data.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
        >
          <Save className="h-5 w-5" />
          Save All Settings
        </button>
      </div>
    </div>
  );
}
