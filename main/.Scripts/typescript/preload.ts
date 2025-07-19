import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getEnv: () => ipcRenderer.invoke('get-env'),
  quitApp: () => ipcRenderer.send('quit-app'),
  getLoginState: () => localStorage.getItem('ultraLogined') === 'true',
  logout: () => {
    localStorage.removeItem('ultraLogined');
    location.reload();
  },
  getLocalIP: () => ipcRenderer.invoke('get-local-ip'),  // ✅ ここだけでOK！
  obfuscateJS: (code:any) => ipcRenderer.invoke('obfuscate-js', code),
  saveToFile: (content:any) => ipcRenderer.invoke('save-to-file', content),
  accountsettings: () => ipcRenderer.invoke('accountsettings'),
  exitToGithub: () => ipcRenderer.invoke('exit-to-github'),
  loginredirects: () => ipcRenderer.invoke('loginredirects'),
  saveTSasJS: (tsCode: string) => ipcRenderer.invoke('save-ts-as-js', tsCode),
  obfuscateTS: (code:any) => ipcRenderer.invoke('obfuscate-ts', code),
});

contextBridge.exposeInMainWorld('secureAPI', {
  save: (email:string, password:string, username:string, birthday:any, option:string) =>
    ipcRenderer.invoke('save-credentials', email, password, username, birthday, option),
  setCurrentEmail: (email:string) => ipcRenderer.invoke('set-current-email', email),
  getCurrentEmail: () => ipcRenderer.invoke('get-current-email'),
  getSelect: (email:string) => ipcRenderer.invoke('get-select', email), // ← New!
  get: (email:string) => ipcRenderer.invoke('get-credentials', email),
  getBirthday: (email:string) => ipcRenderer.invoke('get-birthday', email),
  delete: (email:string) => ipcRenderer.invoke('delete-credentials', email),
  list: (email:string) => ipcRenderer.invoke('list-credentials', email),
});