import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/providers/trpc";
import {
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

function useAutoSave(key: string, debounceMs = 800) {
  const setMutation = trpc.settings.set.useMutation();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = useCallback(
    (value: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setStatus("saving");

      timeoutRef.current = setTimeout(() => {
        setMutation.mutate(
          { key, value },
          {
            onSuccess: () => {
              setStatus("saved");
              setTimeout(() => setStatus("idle"), 1500);
            },
            onError: () => {
              setStatus("error");
              setTimeout(() => setStatus("idle"), 2000);
            },
          }
        );
      }, debounceMs);
    },
    [key, debounceMs, setMutation]
  );

  return { save, status };
}

function SettingInput({
  label,
  sKey,
  type = "text",
  placeholder,
  icon,
}: {
  label: string;
  sKey: string;
  type?: string;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  const { data } = trpc.settings.getValue.useQuery({ key: sKey });
  const [localValue, setLocalValue] = useState("");
  const { save, status } = useAutoSave(sKey);

  useEffect(() => {
    if (data?.value !== null && data?.value !== undefined) {
      setLocalValue(data.value);
    }
  }, [data?.value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    save(val);
  };

  const StatusIcon =
    status === "saving" ? (
      <RefreshCw className="h-3.5 w-3.5 animate-spin text-orange-500" />
    ) : status === "saved" ? (
      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
    ) : status === "error" ? (
      <AlertCircle className="h-3.5 w-3.5 text-red-500" />
    ) : null;

  return (
    <div className="relative">
      <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {icon}
        {label}
        <span className="ml-auto">{StatusIcon}</span>
      </label>
      <input
        type={type}
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
      />
    </div>
  );
}

function SettingToggle({
  label,
  sKey,
  description,
}: {
  label: string;
  sKey: string;
  description?: string;
}) {
  const { data } = trpc.settings.getValue.useQuery({ key: sKey });
  const [localValue, setLocalValue] = useState(false);
  const { save, status } = useAutoSave(sKey);
  const utils = trpc.useUtils();

  useEffect(() => {
    setLocalValue(data?.value === "true");
  }, [data?.value]);

  const handleToggle = () => {
    const newVal = !localValue;
    setLocalValue(newVal);
    save(String(newVal));
    utils.agent.status.invalidate();
  };

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div>
        <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
          {label}
          {status === "saved" && <CheckCircle className="h-4 w-4 text-green-500" />}
        </p>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      <button onClick={handleToggle} type="button" className="transition-colors">
        {localValue ? (
          <ToggleRight className="h-8 w-8 text-green-600" />
        ) : (
          <ToggleLeft className="h-8 w-8 text-gray-400" />
        )}
      </button>
    </div>
  );
}

function ConnectionCard({
  label,
  connected,
}: {
  label: string;
  connected?: boolean;
}) {
  return (
    <div
      className={`p-3 rounded-lg border ${
        connected
          ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
          : "bg-gray-50 border-gray-200 dark:bg-gray-700/50 dark:border-gray-700"
      }`}
    >
      <div className="flex items-center gap-2">
        {connected ? (
          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
        )}
        <span className="font-medium text-sm">{label}</span>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: connectionStatus, isLoading: connLoading } =
    trpc.settings.connectionStatus.useQuery();
  const [initDone, setInitDone] = useState(false);
  const initMutation = trpc.settings.initialize.useMutation();

  useEffect(() => {
    if (!initDone) {
      initMutation.mutate(undefined, {
        onSuccess: () => setInitDone(true),
        onError: () => setInitDone(true),
      });
    }
  }, [initDone, initMutation]);

  if (!initDone || connLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Configure your agent and social media connections. Changes save automatically.
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Connection Status
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {connectionStatus && (
            <>
              <ConnectionCard label="Pinterest" connected={connectionStatus.pinterest.connected} />
              <ConnectionCard label="LinkedIn" connected={connectionStatus.linkedin.connected} />
              <ConnectionCard label="Telegram" connected={connectionStatus.telegram.connected} />
              <ConnectionCard
                label="AliExpress Ref"
                connected={connectionStatus.referral.configured}
              />
              <ConnectionCard
                label="Amazon Ref"
                connected={connectionStatus.amazonReferral?.configured}
              />
            </>
          )}
        </div>
      </div>

      {/* Agent Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Agent Configuration
        </h2>
        <div className="space-y-4">
          <SettingToggle
            sKey="agentEnabled"
            label="Enable Agent"
            description="Turn on automatic product finding and posting"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SettingInput
              sKey="agentIntervalMinutes"
              label="Interval (minutes)"
              type="number"
              placeholder="15"
              icon={<Timer className="h-4 w-4" />}
            />
            <SettingInput
              sKey="maxPostsPerDay"
              label="Max Posts Per Day"
              type="number"
              placeholder="96"
              icon={<Hash className="h-4 w-4" />}
            />
            <SettingInput
              sKey="minProductRating"
              label="Min Product Rating"
              type="number"
              placeholder="4.0"
              icon={<Star className="h-4 w-4" />}
            />
            <SettingInput
              sKey="minOrdersCount"
              label="Min Orders Count"
              type="number"
              placeholder="100"
              icon={<ShoppingBag className="h-4 w-4" />}
            />
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
          <SettingInput
            sKey="referralBaseUrl"
            label="Base Referral URL"
            type="url"
            placeholder="https://s.click.aliexpress.com/e/_okL7gE5"
          />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-600" />
            Amazon Associates
          </h2>
          <SettingInput
            sKey="amazonReferralUrl"
            label="Associates Tag"
            type="text"
            placeholder="yourtag-20"
          />
        </div>
      </div>

      {/* Pinterest */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pinterest</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingInput
            sKey="pinterestAccessToken"
            label="Access Token"
            type="password"
            placeholder="pina_..."
          />
          <SettingInput sKey="pinterestBoardId" label="Board ID" type="text" placeholder="trending-products" />
        </div>
      </div>

      {/* LinkedIn */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">LinkedIn</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingInput
            sKey="linkedinAccessToken"
            label="Access Token"
            type="password"
            placeholder="AQXN..."
          />
          <SettingInput
            sKey="linkedinUserId"
            label="User ID (URN)"
            type="text"
            placeholder="urn:li:person:xxx"
          />
        </div>
      </div>

      {/* Telegram */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Telegram</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SettingInput
            sKey="telegramBotToken"
            label="Bot Token"
            type="password"
            placeholder="123456:ABC-DEF..."
          />
          <SettingInput
            sKey="telegramChannelId"
            label="Channel ID"
            type="text"
            placeholder="@mychannel or -100xxxx"
          />
        </div>
      </div>

      {/* Post Template */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Post Template (Telegram)
        </h2>
        <SettingInput
          sKey="postTemplate"
          label="Template"
          type="text"
          placeholder="{title} - {price} - {referralUrl}"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {["{title}", "{description}", "{price}", "{rating}", "{orders}", "{referralUrl}"].map(
            (v) => (
              <span
                key={v}
                className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-400"
              >
                {v}
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
