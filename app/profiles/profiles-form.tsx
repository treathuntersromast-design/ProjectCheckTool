"use client";

import { useEffect, useState } from "react";
import type { Profile, ProfileChecks } from "@/lib/profiles";
import type { ProjectType } from "@/lib/types";

const PROJECT_TYPES: ProjectType[] = ["nextjs", "electron", "node", "other"];

const TYPE_LABELS: Record<ProjectType, string> = {
  nextjs: "Next.js アプリ",
  electron: "Electron アプリ",
  node: "Node.js プロジェクト",
  other: "ドキュメント/その他",
};

const CHECK_LABELS: Array<{ key: keyof ProfileChecks; label: string }> = [
  { key: "ci", label: "CI 必須" },
  { key: "tests", label: "テスト必須" },
  { key: "lint", label: "lint 必須" },
  { key: "readme", label: "README 必須" },
  { key: "branchRule", label: "ブランチ命名規則" },
];

export function ProfilesForm({
  initialProfiles,
  appliedByType,
}: {
  initialProfiles: Record<ProjectType, Profile>;
  appliedByType: Record<ProjectType, string[]>;
}) {
  const [profiles, setProfiles] =
    useState<Record<ProjectType, Profile>>(initialProfiles);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 成功メッセージは数秒で消す
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const toggleCheck = (type: ProjectType, key: keyof ProfileChecks) => {
    setProfiles((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        checks: { ...prev[type].checks, [key]: !prev[type].checks[key] },
      },
    }));
  };

  const setThreshold = (type: ProjectType, raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    const value = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    setProfiles((prev) => ({
      ...prev,
      [type]: { ...prev[type], staleThresholdDays: value },
    }));
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profiles }),
      });
      const data = (await res.json()) as {
        profiles?: Record<ProjectType, Profile>;
        error?: string;
      };
      if (!res.ok || !data.profiles) {
        setError(data.error ?? "保存に失敗しました");
        return;
      }
      setProfiles(data.profiles);
      setMessage("設定を保存しました");
    } catch {
      setError("保存に失敗しました（通信エラー）");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {PROJECT_TYPES.map((type) => {
          const profile = profiles[type];
          const applied = appliedByType[type] ?? [];
          return (
            <div
              key={type}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{TYPE_LABELS[type]}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">
                  {type}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                適用中: {applied.length > 0 ? applied.join("、") : "なし"}
              </p>
              <div className="mt-3 space-y-1.5">
                {CHECK_LABELS.map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={profile.checks[key]}
                      onChange={() => toggleCheck(type, key)}
                    />
                    {label}
                  </label>
                ))}
                <label className="flex items-center gap-2 pt-1 text-sm">
                  停滞アラートしきい値
                  <input
                    type="number"
                    min={0}
                    value={profile.staleThresholdDays}
                    onChange={(e) => setThreshold(type, e.target.value)}
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-right text-sm tabular-nums"
                  />
                  日
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3">
        {message && (
          <span
            role="status"
            aria-live="polite"
            className="text-sm font-medium text-emerald-700"
          >
            {message}
          </span>
        )}
        {error && (
          <span role="alert" className="text-sm font-medium text-red-700">
            {error}
          </span>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
        >
          {saving ? "保存中…" : "設定を保存"}
        </button>
      </div>
    </>
  );
}
