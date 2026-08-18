# 決定台帳（decisions）

重要決定を D-NNN で採番して追記する。新しい決定は末尾に追加する。

---

## D-001: AI チーム体制の発足（2026-08-18）

- **決定**: CEO「シャチョー」をトップとする 11 名体制を発足する。
  - cre-ai-team プラグインを有効化: shacho / pm / tech-lead / engineer / designer / design-ops / qa / biz-ops / pr
  - ローカル追加: security-officer（セキュリティ担当）/ release-ops（リリース/DevOps 担当）
- **方式**: ハイブリッド（プラグイン再利用＋プロジェクト固有の増分）。記録は軽量ログ方式（一旦これで運用し、重くなったら CreAICompany 式フル体制への移行を再検討）。
- **ポータビリティ原則**: 管理対象は「本リポジトリの親フォルダ」を実行時に動的解決する。リポジトリ内のファイルに絶対パスを書かない。
- **担当**: シャチョー
- **関連**: `CLAUDE.md`, `ai-team/log/meetings/2026-08-18-team-kickoff.md`

---

## D-002: アプリ要件の確定と MVP 着手（2026-08-18）

- **決定**（キックオフの持ち越し事項をオーナーが「推奨の形」で承認）:
  - **UI 形態**: ローカル Web アプリ（Next.js 15 + TypeScript + Tailwind、ポート 3777）。データは当面ステートレス／JSON（ネイティブ依存なし）
  - **「実行」の範囲**: 司令塔方式。本アプリが直接実行するのは各プロジェクトの package.json 定義済み npm scripts のみ（将来実装）。製造・修正・リリースは Claude Code／/release スキルを起動する形とし、フローの二重実装をしない
  - **GitHub 連携（PR/Issue）**: 一旦スコープ外。Phase 2 以降で再検討
  - **自己参照**: 本リポジトリ自身も管理対象に含める
  - **Creaters-Tool-Engineer**: フリーエンジニアのポートフォリオとして現状維持（オーナー決定）。本アプリとの統合・置き換えはしない
  - **セキュリティ**: 秘密ファイル deny-list（`.env*`・鍵類）と「書き込みは承認ゲート必須・既定 read-only」を実装初日から組み込む
- **MVP スコープ（Phase 1）**: F1 プロジェクト自動検出＋F2 git 状態ダッシュボード（read-only）
- **担当**: シャチョー（実装統括）
- **関連**: `ai-team/log/meetings/2026-08-18-team-kickoff.md`, `progress.md`

---

## D-003: ブランチ運用と初回リリース（2026-08-18）

- **決定**（オーナー指示）: **master＝本番用、develop＝開発用**。日常の作業は develop で行い、リリース時に master へマージする。GitHub の既定ブランチは master。
- **実施**: GitHub にプライベートリポジトリを作成し、初回リリース（チーム発足＋Phase 1 MVP、3 コミット）を develop → master へマージ・push 済み。
- **担当**: シャチョー（/release フロー実行）
- **関連**: `progress.md`

---

## D-004: モデル運用ルール（2026-08-18）

- **決定**（オーナー指示）: **手を動かす作業（実装・修正・ビルド・リリース作業等）は Opus、それ以外の主に考える業務（企画・仕様・設計判断・レビュー・監査）は Fable** を使用する。
- **適用方法**: シャチョーが subagent 招集時に Agent ツールの model 指定で適用（タスク種別がロール基本値より優先）。ローカルエージェントは frontmatter に既定値を設定済み（security-officer=fable / release-ops=opus）。cre-ai-team プラグイン側の定義は他プロジェクト共用のため変更せず、招集時の model 指定で運用する。
- **担当**: シャチョー
- **関連**: `CLAUDE.md`（モデル運用セクション）

---

## D-005: 初版 v1.0.0 のアーキテクチャ確定（2026-08-18）

- **決定**:
  - 配布形態は **Electron portable exe**（Next.js standalone を utilityProcess で起動、127.0.0.1 バインド）
  - exe 実行時の管理対象ルートは「exe の実位置（PORTABLE_EXECUTABLE_DIR）から上へ最大 3 階層を探索し、.git を持つサブフォルダを含む最初のディレクトリ」で動的解決。PROJECT_ROOT 環境変数が最優先
  - アプリデータ（tasks/executions/profiles/releases）は exe 時は userData、npm 起動時はリポジトリの `data/`（gitignore 済み）
  - アクション実行は「package.json 定義済み scripts のみ・dry-run → 承認 → 実行・E-NNN 監査ログ」。/release の自動起動は次版（v1 は案内まで)
- **QA 判定**: 高指摘（0.0.0.0 バインド）修正済み・リリース可。中指摘の Origin 検証は次版（127.0.0.1 バインドで当面緩和）
- **担当**: シャチョー（統括）／engineer・release-ops@Opus（実装）／qa@Fable（検証）
- **関連**: `progress.md`, `ai-team/log/meetings/2026-08-18-v1-implementation.md`

---

## D-006: リポジトリの public 化と公開前対策（2026-08-18）

- **決定**（オーナー指示）: GitHub リポジトリを **public** で公開する。公開前にセキュリティリスク確認を必須とする。
- **自己レビューの実施**: コードレビュー 8 観点＋セキュリティ精査を実施。秘密情報（キー・トークン等）は追跡ファイル・git 全履歴ともゼロを確認。
- **公開前に実施した対策**:
  - 初期サンプルタスク（seed 元）から他プロジェクトの内部状態への言及を除去し汎化（SEC ブロッカー B-1 対応）
  - 変更系 API の Origin/Host 検証を middleware で実装（CSRF・DNS リバインディング対策。QA 指摘 M-1 の前倒し）
  - 実バグ修正: 孤児復旧の競合・並行書き込みの排他・読み取り失敗時のデータ喪失経路・exe での自己判定
- **許容した露出**（オーナー報告事項）: ai-team ログ・決定台帳に管理対象プロジェクトの名称と一般的な運用課題が記載されている（秘密の実体値はなし）。コミット author のメールアドレスは公開される（GitHub アカウント名から推測可能な範囲）。
- **担当**: シャチョー（統括）／security-officer・レビュー各担当@Fable／engineer@Opus（修正）
- **関連**: `middleware.ts`, `lib/mock/tasks.ts`, `progress.md`
