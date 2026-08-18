# progress

## Phase 0: チーム編成（2026-08-18）— 完了

- [x] cre-ai-team プラグイン有効化（`.claude/settings.json`）
- [x] 運営規約 `CLAUDE.md` 作成（既定人格シャチョー・報告様式・ポータビリティ原則・ゲート）
- [x] ローカルエージェント追加（security-officer / release-ops）
- [x] 活動記録の器（`ai-team/log/`・決定台帳 D-001・本ファイル）
- [x] キックオフミーティング実施・議事録保存（`ai-team/log/meetings/2026-08-18-team-kickoff.md`）
- [x] .gitignore 整備（セキュリティ担当の指摘対応）
- [ ] プラグインエージェントの読み込み確認（次回セッション起動後に /agents で確認）

## Phase 1: 要件確定＋MVP 実装（2026-08-18）— 完了

要件はオーナー承認済み（決定台帳 D-002）。

- [x] UI 形態: ローカル Web（Next.js 15 + TS + Tailwind 4、ポート 3777）
- [x] 「実行」の範囲: 司令塔方式（定義済み npm scripts のみ直接実行・リリースは /release スキルを正とする）
- [x] GitHub 連携: 一旦スコープ外／自己参照: 含める／Creaters-Tool-Engineer: ポートフォリオとして現状維持
- [x] F1 プロジェクト自動検出（親フォルダ動的解決・`lib/scan.ts`）
- [x] F2 git 状態ダッシュボード（ブランチ・作業ツリー・ahead/behind・最終コミット・`lib/git.ts`）
- [x] 健全性シグナル（CI/テスト有無・30 日停滞アラート）
- [x] セキュリティ deny-list（`lib/security.ts`）— read-only 設計
- [x] `npm run build` 成功（型チェック含む）
- [x] 動作確認: 本番起動 → HTTP 200・全 7 プロジェクト検出・主要 UI 要素表示を確認

## Phase 2: 管理機能（未着手・候補）

- [ ] F3 健全性チェックの拡充（種別ごとのチェック定義）
- [ ] F4 課題・進捗管理（プロジェクト横断タスク一覧）
- [ ] GitHub 連携（PR/Issue）の再検討
- [ ] QA・デザインレビューの実施（qa / designer 招集）

## Phase 3: 実行系（未着手・候補）

- [ ] F5 定義済み npm scripts の実行（dry-run → 承認 → 実行、監査ログ）
- [ ] F6 リリース支援（/release スキル起動・プリフライトチェック）
