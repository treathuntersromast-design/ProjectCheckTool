import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 変更系 API の Origin/Host 検証ミドルウェア。
 *
 * 本アプリは 127.0.0.1 でのみ動くローカルツール。以下を防ぐ:
 *  - DNS リバインディング: Host が localhost/127.0.0.1 以外なら 403
 *  - クロスサイトからの変更操作（CSRF 相当）: GET/HEAD 以外で外部 Origin なら 403
 *
 * curl 等ヘッダーを付けないローカルツールは通す（Origin も sec-fetch-site も無い場合）。
 */

/** hostname が localhost / 127.0.0.1 かを判定する。 */
function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** Host ヘッダー値から hostname 部分（ポート除去）を取り出す。 */
function hostnameOf(hostHeader: string): string {
  // IPv6 は本アプリでは想定しない。単純に最後の ":" 以降のポートを落とす。
  const trimmed = hostHeader.trim();
  const idx = trimmed.lastIndexOf(":");
  return idx === -1 ? trimmed : trimmed.slice(0, idx);
}

function forbidden(): NextResponse {
  return NextResponse.json({ error: "アクセスが拒否されました" }, { status: 403 });
}

export function middleware(request: NextRequest): NextResponse {
  // 1. Host 検証（DNS リバインディング対策）
  const host = request.headers.get("host");
  if (!host || !isLocalHostname(hostnameOf(host))) {
    return forbidden();
  }

  // 2. 変更系メソッドの Origin / sec-fetch-site 検証
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    const origin = request.headers.get("origin");
    if (origin) {
      try {
        const originHost = new URL(origin).hostname;
        if (!isLocalHostname(originHost)) {
          return forbidden();
        }
      } catch {
        // Origin が URL として不正なら拒否
        return forbidden();
      }
    } else {
      // Origin が無い場合: ブラウザなら sec-fetch-site が付く。
      // same-origin / none 以外（cross-site 等）なら拒否。
      // sec-fetch-site が無い（curl 等のローカルツール）は通す。
      const secFetchSite = request.headers.get("sec-fetch-site");
      if (secFetchSite && secFetchSite !== "same-origin" && secFetchSite !== "none") {
        return forbidden();
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
