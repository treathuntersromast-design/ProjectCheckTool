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
