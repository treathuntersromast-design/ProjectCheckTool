/**
 * 秘密情報ファイルの deny-list。
 * 本アプリはどの経路（スキャン・表示・ログ・将来の AI 連携）でも
 * ここに一致するファイルを読み取ってはならない。
 */
const DENY_FILE_PATTERNS: RegExp[] = [
  /^\.env(\..+)?$/i,
  /\.pem$/i,
  /\.key$/i,
  /credential/i,
  /^secrets?(\..+)?$/i,
];

export function isDeniedFile(fileName: string): boolean {
  return DENY_FILE_PATTERNS.some((pattern) => pattern.test(fileName));
}
