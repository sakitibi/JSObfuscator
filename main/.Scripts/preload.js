"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    getEnv: () => electron_1.ipcRenderer.invoke('get-env'),
    quitApp: () => electron_1.ipcRenderer.send('quit-app'),
    getLoginState: () => localStorage.getItem('ultraLogined') === 'true',
    logout: () => {
        localStorage.removeItem('ultraLogined');
        location.reload();
    },
    getLocalIP: () => electron_1.ipcRenderer.invoke('get-local-ip'), // ✅ ここだけでOK！
    obfuscateJS: (code) => electron_1.ipcRenderer.invoke('obfuscate-js', code),
    saveToFile: (content) => electron_1.ipcRenderer.invoke('save-to-file', content),
    accountsettings: () => electron_1.ipcRenderer.invoke('accountsettings'),
    exitToGithub: () => electron_1.ipcRenderer.invoke('exit-to-github'),
    loginredirects: () => electron_1.ipcRenderer.invoke('loginredirects'),
    saveTSasJS: (tsCode) => electron_1.ipcRenderer.invoke('save-ts-as-js', tsCode),
    obfuscateTS: (code) => electron_1.ipcRenderer.invoke('obfuscate-ts', code),
    OpenURL: (URL) => electron_1.ipcRenderer.invoke('open-url', URL),
});
electron_1.contextBridge.exposeInMainWorld('secureAPI', {
    save: (email, password, username, birthday, option) => electron_1.ipcRenderer.invoke('save-credentials', email, password, username, birthday, option),
    setCurrentEmail: (email) => electron_1.ipcRenderer.invoke('set-current-email', email),
    getCurrentEmail: () => electron_1.ipcRenderer.invoke('get-current-email'),
    getSelect: (email) => electron_1.ipcRenderer.invoke('get-select', email), // ← New!
    get: (email) => electron_1.ipcRenderer.invoke('get-credentials', email),
    getBirthday: (email) => electron_1.ipcRenderer.invoke('get-birthday', email),
    delete: (email) => electron_1.ipcRenderer.invoke('delete-credentials', email),
    list: (email) => electron_1.ipcRenderer.invoke('list-credentials', email),
});
