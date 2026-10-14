const { app, BrowserWindow, ipcMain, safeStorage, shell, clipboard } = require("electron");
const fs = require("node:fs/promises");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const https = require("node:https");
const os = require("node:os");
const defaults = { selectedInstance: "vanilla", instances: [{ id: "vanilla", name: "Vanilla", version: "26.3", loader: "Vanilla" }], settings: { performance: true, fps: true, coordinates: false, keystrokes: false, zoom: true, fullbright: false, vanillaPlus: false }, friends: [], hotbars: [] };
const fallbackMinecraftReleases = "1.0,1.1,1.2,1.2.1,1.2.2,1.2.3,1.2.4,1.2.5,1.3.1,1.3.2,1.4.2,1.4.4,1.4.5,1.4.6,1.4.7,1.5,1.5.1,1.5.2,1.6.1,1.6.2,1.6.4,1.7.2,1.7.3,1.7.4,1.7.5,1.7.6,1.7.7,1.7.8,1.7.9,1.7.10,1.8,1.8.1,1.8.2,1.8.3,1.8.4,1.8.5,1.8.6,1.8.7,1.8.8,1.8.9,1.9,1.9.1,1.9.2,1.9.3,1.9.4,1.10,1.10.1,1.10.2,1.11,1.11.1,1.11.2,1.12,1.12.1,1.12.2,1.13,1.13.1,1.13.2,1.14,1.14.1,1.14.2,1.14.3,1.14.4,1.15,1.15.1,1.15.2,1.16,1.16.1,1.16.2,1.16.3,1.16.4,1.16.5,1.17,1.17.1,1.18,1.18.1,1.18.2,1.19,1.19.1,1.19.2,1.19.3,1.19.4,1.20,1.20.1,1.20.2,1.20.3,1.20.4,1.20.5,1.20.6,1.21,1.21.1,1.21.2,1.21.3,1.21.4,1.21.5,1.21.6,1.21.7,1.21.8,1.21.9,1.21.10,1.21.11,26.1,26.1.1,26.1.2,26.2,26.3".split(",");
const sortMinecraftVersions = versions => versions.sort((a, b) => {
  const left = a.split(".").map(Number), right = b.split(".").map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    const difference = (right[i] || 0) - (left[i] || 0);
    if (difference) return difference;
  }
  return 0;
});
const dataFile = () => path.join(app.getPath("userData"), "sb-client.json");
async function readState() { try { const data = JSON.parse(await fs.readFile(dataFile(), "utf8")); return { ...defaults, ...data, instances: Array.isArray(data.instances) ? data.instances : defaults.instances, settings: { ...defaults.settings, ...(data.settings || {}) }, friends: Array.isArray(data.friends) ? data.friends : [], hotbars: Array.isArray(data.hotbars) ? data.hotbars : [] }; } catch { return defaults; } }
async function saveState(value) { const safe = { selectedInstance: String(value.selectedInstance || "vanilla"), instances: Array.isArray(value.instances) ? value.instances.slice(0, 500).map(i => ({ id: String(i.id).slice(0,80), name: String(i.name).slice(0,48), version: String(i.version).slice(0,24), loader: String(i.loader).slice(0,24) })) : defaults.instances, settings: Object.fromEntries(Object.entries(value.settings || {}).map(([k,v]) => [String(k).slice(0,48), Boolean(v)])), friends: Array.isArray(value.friends) ? value.friends.slice(0,200).map(n => String(n).trim().slice(0,32)).filter(Boolean) : [], hotbars: Array.isArray(value.hotbars) ? value.hotbars.slice(0,1000).map(h => ({id:String(h.id).slice(0,80),name:String(h.name).trim().slice(0,48),category:String(h.category).slice(0,32),items:Array.isArray(h.items)?h.items.slice(0,9).map(x=>String(x).slice(0,60)):[]})).filter(h=>h.name) : [] }; await fs.mkdir(path.dirname(dataFile()), { recursive: true }); await fs.writeFile(dataFile(), JSON.stringify(safe,null,2), "utf8"); return safe; }
function requestJson(url, headers={}) { return new Promise((resolve,reject) => { https.get(url,{headers:{"User-Agent":"SBClient/0.1 (launcher)",...headers}},res => { let body=""; res.setEncoding("utf8"); res.on("data",c=>body+=c); res.on("end",()=>{ if(res.statusCode<200||res.statusCode>=300) return reject(new Error(`HTTP ${res.statusCode}`)); try{resolve(JSON.parse(body))}catch(e){reject(e)} }); }).on("error",reject); }); }
function gameDir(id) { if(!/^[\w-]{1,80}$/.test(id)) throw new Error("Ungültige Instanz."); return path.join(app.getPath("userData"),"instances",id); }
async function downloadMod(url, instanceId, filename, contentType = "mod") {
  const allowed = { mod: ["mods", ".jar"], resourcepack: ["resourcepacks", ".zip"], shader: ["shaderpacks", ".zip"] }[contentType];
  if (!allowed) throw new Error("Dieser Inhaltstyp wird noch nicht unterstützt.");
  const u = new URL(url); if (u.protocol !== "https:" || !["cdn.modrinth.com", "edge.forgecdn.net", "mediafilez.forgecdn.net"].includes(u.hostname)) throw new Error("Downloadquelle nicht erlaubt.");
  const safe = path.basename(filename).replace(/[^\w. -]/g, "_"); if (!safe.toLowerCase().endsWith(allowed[1])) throw new Error(`Für diesen Inhalt ist eine ${allowed[1]}-Datei erforderlich.`);
  const dir = path.join(gameDir(instanceId), allowed[0]); await fs.mkdir(dir, { recursive: true }); const dest = path.join(dir, safe);
  await new Promise((resolve, reject) => { const file = require("node:fs").createWriteStream(dest); https.get(u, { headers: { "User-Agent": "SBClient/0.1" } }, res => { if (res.statusCode < 200 || res.statusCode >= 300) { file.close(); return reject(new Error(`Download HTTP ${res.statusCode}`)); } res.pipe(file); file.on("finish", () => file.close(resolve)); }).on("error", reject); });
  return { name: safe };
}
function loaderSlug(loader) { return ({ Fabric: "fabric", Forge: "forge", NeoForge: "neoforge", Quilt: "quilt" })[loader] || "fabric"; }
function createWindow() { const win=new BrowserWindow({width:1440,height:900,minWidth:1080,minHeight:700,backgroundColor:"#11100b",title:"SB Client",webPreferences:{preload:path.join(__dirname,"preload.js"),contextIsolation:true,nodeIntegration:false,sandbox:true}});const page=path.join(__dirname,"renderer","index.html"),trustedUrl=pathToFileURL(page).href;win.webContents.setWindowOpenHandler(()=>({action:"deny"}));win.webContents.on("will-navigate",(e,url)=>{if(url!==trustedUrl)e.preventDefault()});win.loadFile(page);return win;}
function requireTrustedSender(event){const url=pathToFileURL(path.join(__dirname,"renderer","index.html")).href;if(event.senderFrame?.url!==url)throw new Error("Untrusted renderer");}
function requestHttp(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(new URL(url), { method, headers: { "User-Agent": "SBClient/0.1", ...headers } }, response => {
      let text = ""; response.setEncoding("utf8"); response.on("data", chunk => text += chunk);
      response.on("end", () => { let data; try { data = JSON.parse(text); } catch { return reject(new Error("Ungültige Antwort vom Anmeldedienst.")); }
        if (response.statusCode < 200 || response.statusCode >= 300) { const error = new Error(data.error_description || data.errorMessage || data.error || `HTTP ${response.statusCode}`); error.code = data.error; return reject(error); }
        resolve(data);
      });
    }); request.on("error", reject); if (body) request.write(body); request.end();
  });
}
async function postJson(url, payload, headers = {}) { return requestHttp("POST", url, JSON.stringify(payload), { "Content-Type": "application/json", Accept: "application/json", ...headers }); }
async function postForm(url, params) { const body = new URLSearchParams(params).toString(); return requestHttp("POST", url, body, { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }); }
const authFile = () => path.join(app.getPath("userData"), "microsoft-auth.bin");
const clientIdFile = () => path.join(app.getPath("userData"), "microsoft-client-id.txt");
let pendingMicrosoftLogin = null;
let microsoftPollBusy = false;
async function getMicrosoftProfile() {
  try { if (!safeStorage.isEncryptionAvailable()) return null; const raw = await fs.readFile(authFile()); const saved = JSON.parse(safeStorage.decryptString(raw)); return saved.profile || null; } catch { return null; }
}
async function exchangeForMinecraft(accessToken) {
  const user = await postJson("https://user.auth.xboxlive.com/user/authenticate", { Properties: { AuthMethod: "RPS", SiteName: "user.auth.xboxlive.com", RpsTicket: `d=${accessToken}` }, RelyingParty: "http://auth.xboxlive.com", TokenType: "JWT" });
  const xsts = await postJson("https://xsts.auth.xboxlive.com/xsts/authorize", { Properties: { SandboxId: "RETAIL", UserTokens: [user.Token] }, RelyingParty: "rp://api.minecraftservices.com/", TokenType: "JWT" });
  const uhs = xsts.DisplayClaims?.xui?.[0]?.uhs; if (!uhs || !xsts.Token) throw new Error("Xbox konnte das Konto nicht für Minecraft bestätigen.");
  const minecraft = await postJson("https://api.minecraftservices.com/authentication/login_with_xbox", { identityToken: `XBL3.0 x=${uhs};${xsts.Token}`, ensureLegacyEnabled: true });
  let profile; try { profile = await requestJson("https://api.minecraftservices.com/minecraft/profile", { Authorization: `Bearer ${minecraft.access_token}` }); }
  catch { throw new Error("Dieses Microsoft-Konto besitzt offenbar kein spielberechtigtes Minecraft-Java-Profil."); }
  if (!profile.id || !profile.name) throw new Error("Minecraft hat kein spielbares Java-Profil zurückgegeben.");
  return { profile, minecraftToken: minecraft.access_token };
}
app.whenReady().then(()=>{ipcMain.handle("system:inspect", async e => { requireTrustedSender(e); let gpu = "Nicht erkannt"; try { const info = await app.getGPUInfo("basic"); gpu = info.gpuDevice?.find(x => x.active)?.deviceString || info.gpuDevice?.[0]?.deviceString || gpu; } catch {} const displays = require("electron").screen.getAllDisplays().map(d => `${Math.round(d.size.width)}×${Math.round(d.size.height)} @ ${Math.round(d.scaleFactor*100)}%`); const ram = Math.round(os.totalmem()/1024/1024/1024*10)/10; return {cpu:os.cpus()[0]?.model||"Unbekannt",threads:os.cpus().length,ram,gpu,displays}; });ipcMain.handle("clipboard:write",(e,text)=>{requireTrustedSender(e);const value=String(text||"");if(value.length>1000000)throw new Error("Text zu lang für die Zwischenablage.");clipboard.writeText(value);return true});ipcMain.handle("state:read",e=>{requireTrustedSender(e);return readState()});ipcMain.handle("state:save",(e,v)=>{requireTrustedSender(e);return saveState(v)});ipcMain.handle("versions:list",async e=>{requireTrustedSender(e);try{const m=await requestJson("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json");const versions=sortMinecraftVersions([...new Set([...m.versions.filter(v=>v.type==="release").map(v=>v.id),...fallbackMinecraftReleases])]);return {latest:versions[0],versions}}catch{const versions=sortMinecraftVersions([...fallbackMinecraftReleases]);return {latest:versions[0],versions}}});ipcMain.handle("mods:search", async (e, { provider, query, instance, contentType = "mod" }) => {
    requireTrustedSender(e); if (!instance || !query?.trim()) return [];
    if (!["mod", "resourcepack", "shader"].includes(contentType)) throw new Error("Inhaltstyp wird nicht unterstützt.");
    if (contentType === "mod" && instance.loader === "Vanilla") throw new Error("Mods benötigen Fabric, Forge, NeoForge oder Quilt.");
    if (provider === "modrinth") {
      const facets = [[`project_type:${contentType}`], [`versions:${instance.version}`]];
      if (contentType === "mod") facets.push([`categories:${loaderSlug(instance.loader)}`]);
      const url = "https://api.modrinth.com/v2/search?" + new URLSearchParams({ query: query.trim(), facets: JSON.stringify(facets), limit: "20" });
      const data = await requestJson(url); return data.hits.map(p => ({ id: p.project_id, name: p.title, description: p.description, icon: p.icon_url, downloads: p.downloads, provider: "modrinth" }));
    }
    if (provider === "curseforge") {
      if (contentType !== "mod") throw new Error("CurseForge-Suche für Resourcepacks und Shader wird noch ergänzt. Modrinth funktioniert dafür bereits.");
      const secretPath = path.join(app.getPath("userData"), "curseforge.key"); let key = "";
      try { const enc = await fs.readFile(secretPath); if (!safeStorage.isEncryptionAvailable()) throw new Error("Sichere Speicherung nicht verfügbar."); key = safeStorage.decryptString(enc); } catch {}
      if (!key) throw new Error("CurseForge benötigt einen persönlichen API-Schlüssel.");
      const url = "https://api.curseforge.com/v1/mods/search?" + new URLSearchParams({ gameId: "432", classId: "6", searchFilter: query.trim(), gameVersion: instance.version, modLoaderType: String(({ Forge: 1, Fabric: 4, Quilt: 5, NeoForge: 6 })[instance.loader] || 0), pageSize: "20", sortField: "2" });
      const d = await requestJson(url, { "x-api-key": key }); return (d.data || []).map(p => ({ id: String(p.id), name: p.name, description: p.summary, icon: p.logo?.url, downloads: p.downloadCount, provider: "curseforge" }));
    }
    throw new Error("Unbekannte Quelle.");
  });
  ipcMain.handle("mods:install", async (e, { provider, projectId, instance, contentType = "mod" }) => {
    requireTrustedSender(e); if (!instance) throw new Error("Keine aktive Instanz ausgewählt.");
    if (contentType === "mod" && instance.loader === "Vanilla") throw new Error("Mods benötigen Fabric, Forge, NeoForge oder Quilt.");
    if (provider === "modrinth") {
      const query = { game_versions: JSON.stringify([instance.version]) }; if (contentType === "mod") { query.loaders = JSON.stringify([loaderSlug(instance.loader)]); }
      const url = "https://api.modrinth.com/v2/project/" + encodeURIComponent(projectId) + "/version?" + new URLSearchParams(query);
      const versions = await requestJson(url); const version = versions[0]; if (!version) throw new Error("Keine passende Version für diese Minecraft-Version gefunden.");
      const file = version.files.find(x => x.primary) || version.files[0]; return (await downloadMod(file.url, instance.id, file.filename, contentType)).name;
    }
    if (provider === "curseforge" && contentType === "mod") {
      const secretPath = path.join(app.getPath("userData"), "curseforge.key"); let key; try { key = safeStorage.decryptString(await fs.readFile(secretPath)); } catch { throw new Error("CurseForge API-Schlüssel fehlt."); }
      const d = await requestJson(`https://api.curseforge.com/v1/mods/${encodeURIComponent(projectId)}/files?gameVersion=${encodeURIComponent(instance.version)}&pageSize=1`, { "x-api-key": key }); const file = d.data?.[0];
      if (!file?.downloadUrl) throw new Error("CurseForge stellt für diese Datei keinen direkten Download bereit."); return (await downloadMod(file.downloadUrl, instance.id, file.fileName, contentType)).name;
    }
    throw new Error("Diese Quelle unterstützt den ausgewählten Inhaltstyp noch nicht.");
  });
  ipcMain.handle("mods:list",async(e,id)=>{requireTrustedSender(e);const dir=path.join(gameDir(id),"mods");try{return (await fs.readdir(dir)).filter(n=>n.toLowerCase().endsWith(".jar"))}catch{return []}});
  ipcMain.handle("contents:list", async (e, { id, contentType }) => { requireTrustedSender(e); const folder = ({ resourcepack: "resourcepacks", shader: "shaderpacks" })[contentType]; if (!folder) throw new Error("Ungültiger Inhaltstyp."); try { return (await fs.readdir(path.join(gameDir(id), folder))).filter(n => n.toLowerCase().endsWith(".zip")); } catch { return []; } });ipcMain.handle("curseforge:set-key",async(e,key)=>{requireTrustedSender(e);if(!safeStorage.isEncryptionAvailable())throw new Error("Sichere Speicherung ist nicht verfügbar.");if(typeof key!=="string"||key.length<20||key.length>300)throw new Error("Der API-Schlüssel sieht ungültig aus.");await fs.writeFile(path.join(app.getPath("userData"),"curseforge.key"),safeStorage.encryptString(key));return true});  ipcMain.handle("auth:has-client-id", async event => { requireTrustedSender(event); try { return Boolean((await fs.readFile(clientIdFile(), "utf8")).trim()); } catch { return false; } });
  ipcMain.handle("auth:set-client-id", async (event, value) => { requireTrustedSender(event); const id = String(value || "").trim(); if (!/^[0-9a-fA-F-]{36}$/.test(id)) throw new Error("Die Microsoft Client-ID muss eine GUID sein."); await fs.writeFile(clientIdFile(), id, "utf8"); return true; });
  ipcMain.handle("auth:start", async event => { requireTrustedSender(event); let clientId = ""; try { clientId = (await fs.readFile(clientIdFile(), "utf8")).trim(); } catch {} if (!clientId) throw new Error("Bitte zuerst deine Microsoft Client-ID eintragen."); const d = await postForm("https://login.microsoftonline.com/common/oauth2/v2.0/devicecode", { client_id: clientId, scope: "XboxLive.signin offline_access" }); pendingMicrosoftLogin = { deviceCode: d.device_code, clientId, interval: Math.max(5, Number(d.interval || 5)), expiresAt: Date.now() + Number(d.expires_in || 900) * 1000 }; return { userCode: d.user_code, verificationUri: d.verification_uri || "https://microsoft.com/devicelogin", message: d.message, interval: pendingMicrosoftLogin.interval }; });
  ipcMain.handle("auth:poll", async event => { requireTrustedSender(event); if (!pendingMicrosoftLogin) throw new Error("Es läuft gerade keine Anmeldung."); if (microsoftPollBusy) return { pending: true }; if (Date.now() >= pendingMicrosoftLogin.expiresAt) { pendingMicrosoftLogin = null; throw new Error("Der Anmeldecode ist abgelaufen. Bitte starte die Anmeldung erneut."); } microsoftPollBusy = true; try { const flow = pendingMicrosoftLogin; let token; try { token = await postForm("https://login.microsoftonline.com/common/oauth2/v2.0/token", { grant_type: "urn:ietf:params:oauth:grant-type:device_code", client_id: flow.clientId, device_code: flow.deviceCode }); } catch (error) { if (error.code === "authorization_pending" || error.code === "slow_down") return { pending: true }; throw error; } const result = await exchangeForMinecraft(token.access_token); const saved = { profile: result.profile, microsoftAccessToken: token.access_token, refreshToken: token.refresh_token || "", microsoftExpiresAt: Date.now() + Number(token.expires_in || 3600) * 1000, minecraftAccessToken: result.minecraftToken }; if (!safeStorage.isEncryptionAvailable()) throw new Error("Windows bietet gerade keine sichere Speicherung für Anmeldedaten an."); await fs.writeFile(authFile(), safeStorage.encryptString(JSON.stringify(saved))); pendingMicrosoftLogin = null; return { pending: false, profile: result.profile }; } finally { microsoftPollBusy = false; } });
  ipcMain.handle("auth:profile", async event => { requireTrustedSender(event); return getMicrosoftProfile(); });
  ipcMain.handle("auth:cancel", event => { requireTrustedSender(event); pendingMicrosoftLogin = null; return true; });
  ipcMain.handle("auth:logout", async event => { requireTrustedSender(event); pendingMicrosoftLogin = null; try { await fs.unlink(authFile()); } catch {} return true; });
  ipcMain.handle("auth:open-verification", event => { requireTrustedSender(event); return shell.openExternal("https://microsoft.com/devicelogin"); });createWindow();app.on("activate",()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})});app.on("window-all-closed",()=>{if(process.platform!=="darwin")app.quit()});









