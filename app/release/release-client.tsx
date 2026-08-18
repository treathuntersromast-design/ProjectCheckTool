"use client";

import { useCallback, useEffect, useState } from "react";
import type { PreflightResult } from "@/lib/preflight";
import type { Release } from "@/lib/releases";
import { PreflightBadge } from "../components/badges";
import { PageHeader } from "../components/page-header";

const FLOW_STEPS = ["分割コミット", "push", "master マージ", "develop 復帰"];

export function ReleaseClient({
  projectNames,
  defaultName,
}: {
  projectNames: string[];
  defaultName: string;
}) {
  const [selectedName, setSelectedName] = useState(defaultName);
  const [showLaunch, setShowLaunch] = useState(false);
  const [copied, setCopied] = useState(false);

  const [preflight, setPreflight] = useState<PreflightResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [preflightError, setPreflightError] = useState<string | null>(null);

  const [releases, setReleases] = useState<Release[]>([]);

  const loadPreflight = useCallback(async (name: string) => {
    setLoading(true);
    setPreflightError(null);
    try {
      const res = await fetch(
        `/api/preflight?project=${encodeURIComponent(name)}`,
        { cache: "no-store" },
      );
      const data = (await res.json()) as PreflightResult & { error?: string };
      if (!res.ok) {
        setPreflight(null);
        setPreflightError(data.error ?? "プリフライトの取得に失敗しました");
        return;
      }
      setPreflight(data);
    } catch {
      setPreflight(null);
      setPreflightError("プリフライトの取得に失敗しました（通信エラー）");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReleases = useCallback(async () => {
    try {
      const res = await fetch("/api/releases", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { releases: Release[] };
      setReleases(data.releases);
    } catch {
      // 一時的な取得失敗は無視
    }
  }, []);

  // プロジェクト選択が変わるたびにプリフライトを取得
  useEffect(() => {
    void loadPreflight(selectedName);
  }, [selectedName, loadPreflight]);

  // 履歴は初回のみ取得
  useEffect(() => {
    void loadReleases();
  }, [loadReleases]);

  const hasFail = preflight?.overall === "要対応";
  const warnCount = preflight?.warnCount ?? 0;

  const launchText = `cd ../${selectedName}\nclaude\n/release`;

  const copyLaunchText = async () => {
    try {
      await navigator.clipboard.writeText(launchText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // クリップボード不可の環境では何もしない
    }
  };

  return (
    <div>
      <PageHeader
        title="リリース支援"
        description="プリフライトチェックの上で /release スキル（分割コミット → push → master マージ → develop 復帰）を起動する司令塔です（F6）。リリースフローの二重実装はしません。"
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-gray-500">
          対象プロジェクト
          <select
            value={selectedName}
            onChange={(e) => setSelectedName(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
          >
            {projectNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => void loadPreflight(selectedName)}
          disabled={loading}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:text-gray-400"
        >
          {loading ? "チェック中…" : "再チェック"}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold">プリフライトチェック</h2>
            {preflight &&
              (hasFail ? (
                <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                  要対応
                </span>
              ) : (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  リリース可{warnCount > 0 && `（要確認 ${warnCount} 件）`}
                </span>
              ))}
          </div>

          {loading && !preflight ? (
            <p className="py-8 text-center text-sm text-gray-400">
              プリフライトを実行中…
            </p>
          ) : preflightError ? (
            <p
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {preflightError}
            </p>
          ) : preflight ? (
            <ul className="divide-y divide-gray-100">
              {preflight.items.map((item) => (
                <li key={item.label} className="flex items-center gap-3 py-2.5">
                  <PreflightBadge state={item.state} />
                  <span className="flex-1 text-sm">{item.label}</span>
                  {item.note && (
                    <span className="text-xs text-gray-400">{item.note}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold">リリースフロー</h2>
            <ol className="space-y-2">
              {FLOW_STEPS.map((step, i) => (
                <li key={step} className="flex items-center gap-2.5 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs text-white">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => setShowLaunch(true)}
              disabled={hasFail || !preflight}
              className="mt-4 w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              /release スキルで起動
            </button>
            {hasFail && (
              <p className="mt-2 text-xs text-red-700">
                プリフライト NG のため起動できません
              </p>
            )}
            <p className="mt-2 text-xs text-gray-400">
              v1 では起動手順の案内まで（自動起動は今後実装）。
            </p>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold">リリース履歴</h2>
        {releases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-sm text-gray-500">リリース履歴はまだありません</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs text-gray-500">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-medium">ID</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">日時</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">プロジェクト</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">ブランチ</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">コミット数</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">結果</th>
                    <th scope="col" className="px-4 py-2.5 font-medium">実施者</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {releases.map((release) => (
                    <tr key={release.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs">{release.id}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{release.releasedAt}</td>
                      <td className="px-4 py-3 text-xs">{release.project}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {release.fromBranch} → {release.toBranch}
                      </td>
                      <td className="px-4 py-3 text-right text-xs tabular-nums">
                        {release.commitCount}
                      </td>
                      <td className="px-4 py-3">
                        {release.result === "成功" ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">成功</span>
                        ) : release.result === "承認待ち" ? (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">承認待ち</span>
                        ) : (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700">失敗</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{release.actor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {showLaunch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold">/release スキルの起動</h2>
            <p className="mt-2 text-sm text-gray-600">
              対象プロジェクトのフォルダで Claude Code を開き、/release
              を実行してください。v1 では起動手順の案内まで（自動起動は今後実装）。
            </p>
            <pre className="mt-3 rounded-lg bg-gray-900 p-4 font-mono text-xs leading-relaxed text-gray-100">
              {launchText}
            </pre>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={copyLaunchText}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
              >
                {copied ? "コピーしました" : "コピー"}
              </button>
              <button
                type="button"
                onClick={() => setShowLaunch(false)}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
