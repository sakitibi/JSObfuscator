import { app, BrowserWindow, ipcMain, Menu, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import obfuscator from 'javascript-obfuscator';
import keytar from 'keytar';
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

  // email を先に取得する必要がある！
  let email: string | undefined;
  if (win && win.webContents) {
    const result = await keytar.getPassword(`${SERVICE}_email`, 'current');
    email = result ?? undefined; // ← ここで null を undefined に変換！
  }

  // 🔐 keytar削除も忘れず
  if (email) {
    await keytar.deletePassword(`${SERVICE}_password`, email);
    await keytar.deletePassword(`${SERVICE}_username`, email);
    await keytar.deletePassword(`${SERVICE}_select`, email);
    await keytar.deletePassword(`${SERVICE}_email`, 'current');
  }

  // 🔄 localStorageの追加削除＋リダイレクト
  if (win && win.webContents) {
    await win.webContents.executeJavaScript(`
      localStorage.removeItem("ultraLogined");
      location.href = '.login.html';
    `);
  }
});

ipcMain.handle('set-current-email', async (_e, email) => {
  await keytar.setPassword(`${SERVICE}_email`, 'current', email);
  return true;
});

ipcMain.handle('get-current-email', async () => {
  const currentEmail = await keytar.getPassword(`${SERVICE}_email`, 'current');
  return currentEmail;
});

ipcMain.handle('save-credentials', async (_e, email, password, username, birthday, option) => {
  try{
    console.log("[Main] save-credentials 呼び出し:", email, password, username, birthday, option);
    await keytar.setPassword(`${SERVICE}_password`, email, password);
    await keytar.setPassword(`${SERVICE}_username`, email, username);
    await keytar.setPassword(`${SERVICE}_birthday`, email, birthday);
    const safeOption = (option ?? '0').toString().trim();
    await keytar.setPassword(`${SERVICE}_select`, email, safeOption);
    const savedOption = await keytar.getPassword(`${SERVICE}_select`, email);
    console.log("[save-credentials] 保存後のオプション:", savedOption);
    await keytar.setPassword(`${SERVICE}_email`, 'current', email);
    console.log('[save-credentials] 保存された current email:', email);
    console.log("[Main] save-credentials 呼び出し:", { email, password, username, birthday, option });
    return true;
  } catch(error) {
    console.error("セーブエラー", error);
    return false;
  }
});

ipcMain.handle('get-credentials', async (_e, email) => {
  try{
    console.log('[get-credentials] typeof email:', typeof email);
    console.log('[get-credentials] raw email:', email);
    console.log('[get-credentials] is trimmed empty?:', email?.trim() === '');
    console.log('[get-credentials] 受け取った email:', JSON.stringify(email), '長さ:', email?.length);
    if (!email || typeof email !== 'string' || email.trim() === '') {
      console.warn('[get-credentials] 無効な email:', email);
      throw new Error('Account is required.');
    }
    
    const password = await keytar.getPassword(`${SERVICE}_password`, email);
    const username = await keytar.getPassword(`${SERVICE}_username`, email);
    const birthday = await keytar.getPassword(`${SERVICE}_birthday`, email);
    const option = (await keytar.getPassword(`${SERVICE}_select`, email))?.trim() || '0';
    const currentEmail = await keytar.getPassword(`${SERVICE}_email`, 'current');

    console.log('[get-credentials] 現在保存されている current email:', currentEmail);

    return { password, username, birthday, option };
  } catch(error){
    console.error("ゲットエラー", error);
    return false;
  }
});

ipcMain.handle('delete-credentials', async (_e, email) => {
  await keytar.deletePassword(`${SERVICE}_password`, email);
  await keytar.deletePassword(`${SERVICE}_username`, email);
  await keytar.deletePassword(`${SERVICE}_birthday`, email);
  await keytar.deletePassword(`${SERVICE}_select`, email);
  await keytar.deletePassword(`${SERVICE}_email`, 'current');
  return true;
});

ipcMain.handle('list-credentials', async () => {
  const credentials = await keytar.findCredentials(SERVICE);
  console.log('[keytar] 現在保存されている資格情報:');
  credentials.forEach(c => console.log(`account: ${c.account}, password: ${c.password}`));
  return credentials;
});

ipcMain.handle('save-select', async (_e, email, option) => {
  await keytar.setPassword(`${SERVICE}_select`, email, option.toString().trim());
  return true;
});

ipcMain.handle('get-select', async (_e, email) => {
  const select = await keytar.getPassword(`${SERVICE}_select`, email);
  return select || '';
});

ipcMain.handle('get-birthday', async (_e, email) => {
  try{
    console.log('[get-credentials] typeof email:', typeof email);
    console.log('[get-credentials] raw email:', email);
    console.log('[get-credentials] is trimmed empty?:', email?.trim() === '');
    console.log('[get-credentials] 受け取った email:', JSON.stringify(email), '長さ:', email?.length);
    if (!email || typeof email !== 'string' || email.trim() === '') {
      console.warn('[get-credentials] 無効な email:', email);
      throw new Error('Account is required.');
    }
    
    const birthday = await keytar.getPassword(`${SERVICE}_birthday`, email);
    return { birthday };
  } catch(error){
    console.error("ゲットエラー", error);
    return false;
  }
});

ipcMain.handle('loginredirects', async () => {
  try {
    // 'current' アカウントとして保存された email を取得
    const email = await keytar.getPassword(`${SERVICE}_email`, 'current');
    if (!email) {
      return { success: false, error: 'email 未設定' };
    }

    // keytar から各種資格情報を取得
    const passwordRaw = await keytar.getPassword(`${SERVICE}_password`, email);
    const usernameRaw = await keytar.getPassword(`${SERVICE}_username`, email);
    const birthdayRaw = await keytar.getPassword(`${SERVICE}_birthday`, email);
    const selectValue = await keytar.getPassword(`${SERVICE}_select`, email) || '0';
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
    // Step 1: 独自加工（コメントとダミー関数を注入）
    let jsCode = `
      /* Copyright ${(new Date()).getFullYear()} ${SERVICE}, Inc */ ${code} function _helper_${Math.random().toString(36).slice(2)}(){return ${Math.floor(Math.random() * 1000)};}
    `;

    // Step 2: obfuscator にかける（ランダム設定で自然さを演出）
    const result = obfuscator.obfuscate(jsCode, {
      compact: true,
      renameGlobals: true,
      identifierNamesGenerator: 'mangled',   // a, b, c...
      stringArray: true,
      stringArrayThreshold: 0.4,             // 40%だけ変換
      stringArrayRotate: true,
      stringArrayShuffle: true,
      controlFlowFlattening: false,          // 不自然な構造を避ける
      deadCodeInjection: false,              // 機械っぽい不要コードは避ける
    });

    return result.getObfuscatedCode();
  } catch (err: any) {
    return `エラー: ${err.message}`;
  }
});

ipcMain.handle('obfuscate-ts', async (_event:any, tsCode: string) => {
  try {
    // Step 1: TypeScript → JavaScript
    let jsCode = ts.transpileModule(tsCode, {
      compilerOptions: { module: ts.ModuleKind.CommonJS }
    }).outputText;

    // Step 2: 独自加工（例: コメントとダミー関数を注入）
    jsCode = `
      /* Copyright ${(new Date()).getFullYear()} ${SERVICE}, Inc */ ${jsCode} function _helper_${Math.random().toString(36).slice(2)}(){return ${Math.floor(Math.random() * 1000)};}
    `;

    // Step 3: obfuscator にかける
    const obfuscated = obfuscator.obfuscate(jsCode, {
      compact: true,
      renameGlobals: true,
      identifierNamesGenerator: 'mangled',   // a, b, c...
      stringArray: true,
      stringArrayThreshold: 0.4,             // 40%だけ変換
      stringArrayRotate: true,
      stringArrayShuffle: true,
      controlFlowFlattening: false,          // 不自然な構造を避ける
      deadCodeInjection: false,              // 機械っぽい不要コードは避ける
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