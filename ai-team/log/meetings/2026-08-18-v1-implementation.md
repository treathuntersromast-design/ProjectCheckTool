# 2026-08-18 初版 v1.0.0 本実装と exe 化

## 概要

オーナー承認済みモックアップを本実装し、初版 v1.0.0 を完成。Electron portable exe まで出力した。D-004 のモデル運用（実装=Opus／思考=Fable）を初適用したスプリント。

## オーナーの依頼

- モックアップを一旦実装し、初版の完成まで行う。最終出力は exe ファイルが望ましい。

## 検討・実行内容

シャチョーが設計・工程分割し、5 タスクを順次実行:

1. **[ENG@Opus]** 基盤＋F4: JSON ストア（lib/store.ts、tmp→rename の原子的書き込み）、タスク CRUD（/api/tasks、T-NNN 採番、初回 seed 10 件）、タスク画面実データ化（新規作成モーダル・状態 select・楽観的更新）
2. **[ENG@Opus]** F5: 実行エンジン（lib/executor.ts）。project/script のホワイトリスト検証・パストラバーサル拒否・同一プロジェクト 409 排他・15 分タイムアウト・200KB ログキャプチャ。3 段階モーダルから実実行し、結果ビューでログをライブポーリング表示。監査ログ E-NNN
3. **[ENG@Opus]** F3/F6/F7: プロファイル永続化（/api/profiles）と健全性チェック連動（README 列追加）、実プリフライト（git 実チェック 5 項目＋F5 履歴連動の build/test 判定）、リリース履歴（実績 R-001 を seed）
4. **[REL@Opus]** Electron 化: Next standalone + utilityProcess、ポート 3777（使用中なら空きポート）、127.0.0.1 バインド、データは userData、**管理対象ルートは exe 位置から最大 3 階層探索で動的解決**（ポータビリティ原則を exe でも維持）。electron-builder portable で exe 生成
5. **[QA@Fable]** 最終レビュー: インジェクション・トラバーサル・CSRF 経路を実測検証。**判定「高 1 件のみ修正すればリリース可」** → [ENG@Opus] が修正（H-1: dev/start に -H 127.0.0.1、M-2: 実行中レコードの孤児化復旧、モック残骸削除・型一本化）

最終成果物: **`dist/ProjectCheckTool-1.0.0-portable.exe`（約 119MB）**。実起動で親フォルダ解決・全プロジェクト検出を確認済み。

## 決まったこと

- D-005（アーキテクチャ確定）参照

## 決まらなかったこと / 持ち越し

- QA 中指摘 M-1（変更系 API の Origin/Host 検証）→ 次版（127.0.0.1 バインドで当面緩和）
- GitHub 連携・/release 自動起動・アイコン・コード署名 → Phase 3 候補
- 初版一式のコミット・push はオーナー判断待ち

## 次のアクション

- [オーナー] exe の動作確認（dist/ProjectCheckTool-1.0.0-portable.exe をダブルクリック）
- [オーナー] コミット/push の可否判断
- [シャチョー] 指示があれば /release で分割コミット→master マージ

## 関連ファイル

- `lib/`（store / tasks / executions / executor / running-registry / profiles / preflight / releases）
- `app/api/`（tasks / executions / profiles / preflight / releases / projects）
- `electron/main.js`、`package.json`（v1.0.0）、`progress.md`、決定台帳 D-005
