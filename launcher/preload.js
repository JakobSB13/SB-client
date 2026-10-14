const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("sbClient", Object.freeze({
 inspectSystem:()=>ipcRenderer.invoke("system:inspect"), readState:()=>ipcRenderer.invoke("state:read"), saveState:s=>ipcRenderer.invoke("state:save",s), copyText:t=>ipcRenderer.invoke("clipboard:write",t),
 versions:()=>ipcRenderer.invoke("versions:list"), searchMods:args=>ipcRenderer.invoke("mods:search",args),
 installMod:args=>ipcRenderer.invoke("mods:install",args), listMods:id=>ipcRenderer.invoke("mods:list",id), listContents:args=>ipcRenderer.invoke("contents:list",args), setCurseForgeKey:key=>ipcRenderer.invoke("curseforge:set-key",key),
 hasMicrosoftClientId:()=>ipcRenderer.invoke("auth:has-client-id"), setMicrosoftClientId:id=>ipcRenderer.invoke("auth:set-client-id",id), startMicrosoftLogin:()=>ipcRenderer.invoke("auth:start"), pollMicrosoftLogin:()=>ipcRenderer.invoke("auth:poll"), getMicrosoftProfile:()=>ipcRenderer.invoke("auth:profile"), cancelMicrosoftLogin:()=>ipcRenderer.invoke("auth:cancel"), logoutMicrosoft:()=>ipcRenderer.invoke("auth:logout"), openMicrosoftVerification:()=>ipcRenderer.invoke("auth:open-verification")
}));




