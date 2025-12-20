import { app, BrowserWindow, ipcMain, Menu, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import obfuscator from 'javascript-obfuscator';
import ts from 'typescript';

let win: BrowserWindow | null = null;
let pendingLink: string | null = null;  // ここで一時保存
let isLoggedIn = true;
const appid = "4a534f626675736361746f72";
const SERVICE = '13ninstudio';

// ── 1. DeepLink ハンドラをモジュールトップレベルに切り出し ──
function handleDeepLink(urlStr: string) {
  if (!win) return console.warn('win が未生成');
  console.log('▶️ handleDeepLink:', urlStr);

  const url = new URL(urlStr);
  const cmd = url.hostname;

  switch (cmd) {
    case 'login':
      win.webContents.executeJavaScript(`
        console.log("JS: login");
        location.href="./.login.html";
      `);
      break;
    default:
      console.warn('Unknown command:', cmd);
  }
}

// ── 2. プロトコルクライアント登録は最上部で ──
app.setAsDefaultProtocolClient('jsobfuscator');

// ── 3. will-finish-launching 内で open-url 登録 ──
app.on('will-finish-launching', () => {
  app.on('open-url', (event, urlStr) => {
    event.preventDefault();
    console.log('🔗 open-url:', urlStr);
    pendingLink = urlStr;
    if (win) {
      handleDeepLink(urlStr);
      pendingLink = null;
    }
  });
});

function encodeBase64Unicode(str:any) {
    const bytes = new TextEncoder().encode(str); // UTF-8に変換
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary); // Base64エンコード
}

ipcMain.handle('accountsettings', async () => {
  await shell.openExternal('https://sakitibi-com9.webnode.jp/page/24/b961c547-90b1-0d30-a87e-8bb1aa67eca9/');
  // 🔄 localStorageの追加削除＋リダイレクト
  if (win && win.webContents) {
    await win.webContents.executeJavaScript(`
      localStorage.removeItem("ultraLogined");
      localStorage.removeItem("youtube-subscribe");
      localStorage.removeItem("SaveData");
      location.href = '.login.html';
    `);
  }
});

ipcMain.handle('loginredirects', async (_event, email, password, username, birthday, optional) => {
  try {
    // 'current' アカウントとして保存された email を取得
    if (!email) {
      return { success: false, error: 'email 未設定' };
    }
    const passwordRaw = password;
    const usernameRaw = username;
    const birthdayRaw = birthday;
    const selectValue = optional || '0';
    console.log('[loginredirects] selectValue:', selectValue, 'typeof:', typeof selectValue);
    const select = selectValue?.trim() || '0';

    if (!passwordRaw || !usernameRaw || !birthdayRaw) {
      return { success: false, error: 'keytar からユーザー情報の取得に失敗' };
    }

    console.log('[loginredirects] 取得した current email:', email);

    // 2段階の HEX 変換
    const emailHex = encodeBase64Unicode(Buffer.from(email, 'utf8').toString('hex'));
    const passwordHex = encodeBase64Unicode(Buffer.from(passwordRaw, 'utf8').toString('hex'));
    const usernameHex = encodeBase64Unicode(Buffer.from(usernameRaw, 'utf8').toString('hex'));
    const birthdayHex = encodeBase64Unicode(Buffer.from(birthdayRaw, 'utf8').toString('hex'));

    // 外部リンク URL を生成
    const url = `https://sakitibi.github.io/selects/${appid}/${encodeURIComponent(usernameHex)}/${encodeURIComponent(emailHex)}/${passwordHex}/${birthdayHex}/${select}?pattern=0`;
    console.log("[loginredirects] 外部へのリダイレクトURL:", url);

    await shell.openExternal(url);

    return { success: true, openedUrl: url };
  } catch (err:any) {
    console.error("[loginredirects] エラー:", err);
    return { success: false, error: err.message || err };
  }
});

ipcMain.handle('open-url', async (_event, url) => {
  await shell.openExternal(String(url));
});

ipcMain.handle('get-local-ip', () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const netInterface = nets[name];
    if (!netInterface) continue;
    for (const net of netInterface) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return '127.0.0.1';
});

function updateMenu(win: BrowserWindow) {
  const accountMenuItem = isLoggedIn
    ? {
        label: 'ログアウト',
        click: async () => {
          await win.webContents.executeJavaScript(`
            localStorage.removeItem("ultraLogined");
            location.href = '.login.html';
          `);
          isLoggedIn = false;
          updateMenu(win);
        },
      }
    : {
        label: 'ログイン',
        click: async () => {
          await win.loadFile('main/.login.html');
          isLoggedIn = true;
          updateMenu(win);
        },
      };

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about', label: 'このアプリについて' },
        { type: 'separator' },
        { role: 'services', label: 'サービス' },
        { type: 'separator' },
        { role: 'hide', label: 'TrainBuilders を隠す'},
        { role: 'hideOthers', label: 'ほかを隠す' },
        { role: 'unhide', label: 'すべて表示' },
        { type: 'separator' },
        { role: 'quit', label: 'TrainBuilders を終了' },
      ],
    },
    {
      label: '編集',
      submenu: [
        { role: 'undo', label: '元に戻す', accelerator: 'Cmd+Z' },
        { role: 'redo', label: 'やり直す', accelerator: 'Cmd+Shift+Z' },
        { type: 'separator' },
        { role: 'cut', label: '切り取り', accelerator: 'Cmd+X' },
        { role: 'copy', label: 'コピー', accelerator: 'Cmd+C' },
        { role: 'paste', label: '貼り付け', accelerator: 'Cmd+V' },
        { role: 'selectAll', label: 'すべてを選択', accelerator: 'Cmd+A' },
      ],
    },
    {
      label: '表示',
      submenu: [
        {
          label: '再読み込み',
          accelerator: 'Cmd+R',
          click: () => win && win.loadFile('main/index.html'),
        },
        {
          label: 'フルスクリーン切り替え',
          accelerator: 'Esc',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) focusedWindow.setFullScreen(!focusedWindow.isFullScreen());
          },
        },
        //{ label: 'DevTools を開く', accelerator: 'Cmd+Option+I', role: "toggleDevTools"},
      ],
    },
    {
      label: 'ウィンドウ',
      submenu: [
        {
          label: '最小化',
          accelerator: 'Cmd+K',
          click: () => {
            const focusedWindow = BrowserWindow.getFocusedWindow();
            if (focusedWindow) {
              focusedWindow.minimize();
            }
          },
        },
        { role: 'zoom', label: 'ズーム' },
        { role: 'close', label: '閉じる' },
      ],
    },
    {
      label: '関連Webサイト',
      submenu: [
        {
          label: '公式サイトを開く',
          accelerator: 'Cmd+T',
          click: () => shell.openExternal('https://torebiru.com'),
        },
        {
          label: 'expo2025 大阪関西万博',
          accelerator: 'Cmd+O',
          click: () => shell.openExternal('https://www.expo2025.or.jp'),
        },
        { type: 'separator' },
        {
          label: '名前は長い方が有利関連',
          submenu: [
            {
              label: '被害者リスト',
              accelerator: 'Cmd+N',
              click: () => shell.openExternal('https://asakura-wiki.vercel.app/wiki/13ninstudio/名前は長い方が有利被害者'),
            },
          ],
        },
        {
          label: 'マイ鉄ネット関連',
          submenu: [
            {
              label: '撲滅委員会',
              accelerator: 'Cmd+M',
              click: () => shell.openExternal('https://asakura-wiki.vercel.app/special_wiki/maitetsu_bkmt'),
            },
            {
              label: 'みぞれさんの功績',
              accelerator: 'Cmd+Shift+M',
              click: () => shell.openExternal('https://asakura-wiki.vercel.app/wiki/13ninstudio/Mizore.jp/Result'),
            },
            {
              label: '餅尾戦争支持メンバー',
              submenu: [
                {
                  label: 'みぞれ',
                  click: () => shell.openExternal('https://youtube.com/@mizore471'),
                },
                {
                  label: 'さきちび',
                  click: () => shell.openExternal('https://youtube.com/channel/UCJcP2mfDCtKnADrbDDjT_8g'),
                },
                {
                  label: '匿名',
                  click: () => shell.openExternal('https://discord.gg/zbvXxCWcg6'),
                },
                {
                  label: 'ひなにい',
                  click: () => shell.openExternal('https://youtube.com/@HinaRuka21'),
                }
              ]
            }
          ],
        },
      ],
    },
    {
      label: '13ninアカウント',
      submenu: [accountMenuItem],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createMainWindow() {
  win = new BrowserWindow({
    width: 2000,
    height: 900,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('main/index.html');
  win.webContents.on('did-finish-load', () => {
    // メニュー更新や pendingLink 処理
    updateMenu(win!);
    if (pendingLink) {
      handleDeepLink(pendingLink);
      pendingLink = null;
    }
  });
}

app.whenReady().then(() => {
  createMainWindow();
  if (pendingLink) {
    handleDeepLink(pendingLink);
    pendingLink = null;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('obfuscate-js', async (_event:any, code: string) => {
  try {
    const helperName = `_helper_${Math.random().toString(36).slice(2)}`;

    let jsCode = `
    /* Copyright ${(new Date()).getFullYear()} ${SERVICE}, Inc */
    ${code}
    function ${helperName}() {
      return ${Math.floor(Math.random() * 1000)};
    }
    ${helperName}();
    `;

    const result = obfuscator.obfuscate(jsCode, {
      compact: true,
      renameGlobals: true,
      identifierNamesGenerator: 'mangled',
      stringArray: true,
      controlFlowFlattening: false,
      deadCodeInjection: true,
      transformObjectKeys: true,
      simplify: true,
      numbersToExpressions: false,
    });

    return result.getObfuscatedCode();
  } catch (err: any) {
    return `エラー: ${err.message}`;
  }
});

ipcMain.handle('obfuscate-ts', async (_event:any, tsCode: string) => {
  try {
    let jsCode = ts.transpileModule(tsCode, {
      compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;

    const helperName = `_helper_${Math.random().toString(36).slice(2)}`;

    jsCode = `
    /* Copyright ${(new Date()).getFullYear()} ${SERVICE}, Inc */
    ${jsCode}
    function ${helperName}() {
      return ${Math.floor(Math.random() * 1000)};
    }
    ${helperName}();
    `;

    const obfuscated = obfuscator.obfuscate(jsCode, {
      compact: true,
      renameGlobals: true,
      identifierNamesGenerator: 'mangled',
      stringArray: true,
      controlFlowFlattening: false,
      deadCodeInjection: true,
      transformObjectKeys: true,
      simplify: true,
      numbersToExpressions: false,
    });

    return obfuscated.getObfuscatedCode();
  } catch (err) {
    return `エラー: ${err}`;
  }
});

ipcMain.handle('save-to-file', async (event:any, content:string) => {
  const { filePath } = await dialog.showSaveDialog({
    filters: [{ name: 'JavaScript', extensions: ['js'] }]
  });

  if (filePath) {
    fs.writeFileSync(filePath, content);
    return '保存成功';
  }

  return 'キャンセルされました';
});

ipcMain.handle('save-ts-as-js', async (_event:any, tsCode: string) => {
  try {
    const jsCode = ts.transpileModule(tsCode, {
      compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;

    const { filePath } = await dialog.showSaveDialog({
      defaultPath: 'converted.js',
      filters: [{ name: 'JavaScript', extensions: ['js'] }]
    });

    if (filePath) {
      fs.writeFileSync(filePath, jsCode);
      return '保存成功';
    }

    return 'キャンセルされました';
  } catch (e: any) {
    return `エラー: ${e.message}`;
  }
});

ipcMain.on('quit-app', () => app.quit());