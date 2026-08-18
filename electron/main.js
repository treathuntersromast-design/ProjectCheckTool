// ProjectCheckTool Electron main process (CommonJS)
//
// Next.js standalone サーバー(server.js)を utilityProcess.fork で起動し、
// HTTP 応答をポーリングで待ってから BrowserWindow で読み込む。
//
// 絶対規則:
//  - コードに絶対パスを書かない（実行時に動的解決する）
//  - 他プロジェクトへ書き込まない
//  - 外部公開しない（HOSTNAME=127.0.0.1）
const { app, BrowserWindow, dialog, utilityProcess } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const net = require("node:net");
const http = require("node:http");

const DEFAULT_PORT = 3777;
const HOSTNAME = "127.0.0.1";

let serverProcess = null;
let mainWindow = null;
/** アプリ終了処理中フラグ。意図しないサーバー終了と区別する。 */
let isQuitting = false;

/**
 * standalone サーバー(server.js)のパスを解決する。
 * - パッケージ時: extraResources で process.resourcesPath/standalone に配置される
 * - 開発（非パッケージ）時: リポジトリの .next/standalone を使う
 */
function resolveServerEntry() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "standalone", "server.js");
  }
  // electron/main.js から見てリポジトリルート直下の .next/standalone
  return path.join(__dirname, "..", ".next", "standalone", "server.js");
}

/**
 * 空きポートを取得する。まず希望ポートを試し、使用中なら OS に任せて(listen 0)
 * 空きポートを取得する。
 */
function findAvailablePort(preferred) {
  return new Promise((resolve, reject) => {
    const tryListen = (port, fallbackToAny) => {
      const server = net.createServer();
      server.unref();
      server.on("error", (err) => {
        if (fallbackToAny && (err.code === "EADDRINUSE" || err.code === "EACCES")) {
          // 希望ポートが使えない → 任意の空きポートを取得
          tryListen(0, false);
        } else {
          reject(err);
        }
      });
      server.listen(port, HOSTNAME, () => {
        const actual = server.address().port;
        server.close(() => resolve(actual));
      });
    };
    tryListen(preferred, true);
  });
}

/**
 * 管理対象ルート(PROJECT_ROOT)を解決する。ポータビリティの要。
 *
 * 優先順:
 *  1. ユーザーが環境変数 PROJECT_ROOT を設定済みならそれを尊重
 *  2. exe の位置(PORTABLE_EXECUTABLE_DIR 優先、なければ execPath の dir)から
 *     上へ最大 3 階層を調べ、「.git を持つサブフォルダを 1 つ以上含む」
 *     最初のディレクトリを採用
 *  3. 見つからなければ exeDir/.. にフォールバック
 *
 * 非パッケージ(開発)時はリポジトリの親（= npm 起動時の cwd/.. と同じ場所）を返す。
 * これで npm 起動時と exe/electron 起動時で管理対象ルートが一致する。
 */
function resolveProjectRoot() {
  // ユーザー指定を最優先
  if (process.env.PROJECT_ROOT) return process.env.PROJECT_ROOT;

  // 非パッケージ(開発)時: リポジトリルート(= __dirname/..) の親を明示的に設定する。
  // server.js の cwd は standalone 配下になるため cwd/.. では解決できない。
  if (!app.isPackaged) {
    return path.resolve(__dirname, "..", "..");
  }

  // portable exe は一時展開されるため、実際の exe 位置を優先的に使う
  const exeDir =
    process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath);

  const hasGitSubfolder = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return false;
    }
    return entries.some(
      (entry) =>
        entry.isDirectory() && fs.existsSync(path.join(dir, entry.name, ".git")),
    );
  };

  // exeDir → exeDir/.. → exeDir/../.. の順に調べる
  let candidate = exeDir;
  for (let depth = 0; depth < 3; depth += 1) {
    if (hasGitSubfolder(candidate)) return candidate;
    candidate = path.dirname(candidate);
  }

  // フォールバック: exeDir の 1 つ上
  return path.dirname(exeDir);
}

/**
 * standalone サーバーを子プロセスとして起動する。
 */
function startServer(port) {
  const serverEntry = resolveServerEntry();
  if (!fs.existsSync(serverEntry)) {
    throw new Error(`standalone server not found: ${serverEntry}`);
  }

  const env = {
    ...process.env,
    PORT: String(port),
    HOSTNAME,
    NODE_ENV: "production",
  };

  const projectRoot = resolveProjectRoot();
  if (projectRoot) env.PROJECT_ROOT = projectRoot;

  // データ保存先:
  //  - パッケージ時: userData 配下（一時展開先は消えるため）
  //  - 非パッケージ時: リポジトリ/data（npm 起動時と同じ保存先に揃える）
  if (app.isPackaged) {
    env.PCT_DATA_DIR = path.join(app.getPath("userData"), "data");
  } else {
    env.PCT_DATA_DIR = path.resolve(__dirname, "..", "data");
  }

  serverProcess = utilityProcess.fork(serverEntry, [], {
    env,
    cwd: path.dirname(serverEntry),
    stdio: "inherit",
  });

  serverProcess.on("exit", (code) => {
    serverProcess = null;
    // アプリ終了処理中の停止は正常なので何もしない。
    if (isQuitting) return;
    // 終了処理中でないのにサーバーが落ちた = 想定外。
    // エラーを表示してアプリごと終了する（サーバーなしでは機能しないため）。
    console.error(`[main] server process exited unexpectedly with code ${code}`);
    try {
      dialog.showErrorBox(
        "ProjectCheckTool",
        `サーバープロセスが予期せず終了しました（code ${code}）。アプリを終了します。`,
      );
    } catch {
      // ダイアログ表示不可の環境は無視して終了に進む
    }
    isQuitting = true;
    app.quit();
  });
}

/**
 * サーバーが HTTP 応答を返すまでポーリングで待つ。
 */
function waitForServer(port, { timeoutMs = 30000, intervalMs = 300 } = {}) {
  const url = `http://${HOSTNAME}:${port}/`;
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        // 何らかの HTTP ステータスが返れば起動完了とみなす
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > deadline) {
          reject(new Error(`server did not respond within ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, intervalMs);
        }
      });
    };
    attempt();
  });
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "ProjectCheckTool",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.setTitle("ProjectCheckTool");
  mainWindow.loadURL(`http://${HOSTNAME}:${port}`);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function stopServer() {
  // 以降の exit は意図した停止として扱う。
  isQuitting = true;
  if (serverProcess) {
    try {
      serverProcess.kill();
    } catch {
      // ignore
    }
    serverProcess = null;
  }
}

app.whenReady().then(async () => {
  try {
    const port = await findAvailablePort(DEFAULT_PORT);
    startServer(port);
    await waitForServer(port);
    createWindow(port);
  } catch (err) {
    console.error("[main] startup failed:", err);
    stopServer();
    app.quit();
  }
});

app.on("window-all-closed", () => {
  // window を全て閉じたらサーバーを止めてアプリ終了（macOS 慣習より安全側を優先）
  stopServer();
  app.quit();
});

app.on("before-quit", () => {
  stopServer();
});
