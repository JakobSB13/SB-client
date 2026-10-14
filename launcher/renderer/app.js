const defaults = {
  selectedInstance: "vanilla",
  instances: [{ id: "vanilla", name: "Vanilla", version: "26.3", loader: "Vanilla" }],
  settings: { performance: true, fps: true, coordinates: false, keystrokes: false, zoom: true, fullbright: false, vanillaPlus: false }, friends: [], hotbars: []
};
let state = structuredClone(defaults);
let signedInProfile = null;
const names = { home: "ÜBERSICHT", instances: "INSTANZEN", mods: "MODS & INHALTE", social: "COMMUNITY", settings: "EINSTELLUNGEN", guides: "SPIELHILFEN", hotbars: "SAVED HOTBARS" };
const settingsInfo = [
  ["performance", "Performance-Profil", "Aktiviert empfohlene, faire Performance-Einstellungen."],
  ["fps", "FPS-Anzeige", "Zeigt die Bildrate im Spiel an."],
  ["coordinates", "Koordinaten", "Zeigt Position und Richtung als HUD an."],
  ["keystrokes", "Tastenanzeige", "Zeigt gedrückte Tasten und Mausklicks an."],
  ["zoom", "Zoom", "Komfort-Zoom für normale Nutzung."],
  ["fullbright", "Helligkeit", "Lokale Helligkeitseinstellung für deine eigene Ansicht."],
  ["vanillaPlus", "Vanilla+-Modus", "Reduziert Client-Erweiterungen auf Performance und Komfort."]
];
const $ = (selector) => document.querySelector(selector);
const toast = (message) => { const item = $("#toast"); item.textContent = message; item.classList.add("show"); clearTimeout(toast.timer); toast.timer = setTimeout(() => item.classList.remove("show"), 2400); };
const persist = async () => { if (window.sbClient) state = await window.sbClient.saveState(state); };
const activeInstance = () => state.instances.find((item) => item.id === state.selectedInstance) || state.instances[0];

function go(view) {
  document.querySelectorAll(".page").forEach((page) => page.classList.toggle("active", page.id === "view-" + view));
  document.querySelectorAll(".nav-item[data-view]").forEach((button) => button.classList.toggle("active", button.dataset.view === view));
  $("#crumb").textContent = names[view] || names.home;
  if (view === "instances") renderInstances();
  if (view === "settings") renderSettings();
  if (view === "mods") renderMods();
  if (view === "social") renderFriends();
  if (view === "guides") renderGuides();
  if (view === "hotbars") renderHotbars();
}
function renderHome() {
  const instance = activeInstance();
  $("#hero-version").innerHTML = (instance ? escapeHtml(instance.version) : "—") + " <span>" + (instance ? escapeHtml(instance.loader.toUpperCase()) : "KEINE INSTANZ") + "</span>";
  $("#hero-instance").textContent = "Aktive Instanz: " + (instance ? instance.name : "Keine Instanz");
  $("#instance-summary").textContent = state.instances.length + (state.instances.length === 1 ? " Instanz eingerichtet" : " Instanzen eingerichtet");
}
function escapeHtml(text) { return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

function renderInstances() {
  const list = $("#instance-list"), detail = $("#instance-detail");
  if (!state.instances.length) {
    list.innerHTML = '<div class="empty-state">▦<b>Noch keine Instanzen</b>Erstelle eine Spielumgebung für deinen Start.</div>';
    detail.innerHTML = '<div class="empty-state"><b>Wähle eine Instanz</b>Oder erstelle eine neue Instanz.</div>'; return;
  }
  list.innerHTML = state.instances.map((item) => '<div class="instance-row ' + (item.id === state.selectedInstance ? "selected" : "") + '" data-id="' + escapeHtml(item.id) + '"><div class="instance-icon">▰</div><div><span class="instance-name">' + escapeHtml(item.name) + '</span><span class="instance-meta">' + escapeHtml(item.version) + " · " + escapeHtml(item.loader) + '</span></div>' + (item.id === state.selectedInstance ? '<span class="instance-check">✓</span>' : "") + "</div>").join("");
  list.querySelectorAll(".instance-row").forEach((row) => row.addEventListener("click", async () => { state.selectedInstance = row.dataset.id; await persist(); renderInstances(); renderHome(); }));
  const item = activeInstance();
  detail.innerHTML = '<div class="detail-head"><div><h2>' + escapeHtml(item.name) + '</h2><div class="detail-meta">Minecraft ' + escapeHtml(item.version) + " · " + escapeHtml(item.loader) + '</div></div><span class="detail-badge">LOKALE INSTANZ</span></div><div class="detail-divider"></div><div class="detail-stats"><div class="stat-box"><small>SPIELVERSION</small><b>' + escapeHtml(item.version) + '</b></div><div class="stat-box"><small>LOADER</small><b>' + escapeHtml(item.loader) + '</b></div><div class="stat-box"><small>STATUS</small><b>Noch nicht installiert</b></div></div><div class="detail-actions"><button class="primary-button" id="choose-instance">Als aktiv wählen</button><button class="secondary-button" id="rename-instance">Umbenennen</button><button class="danger-button" id="delete-instance">Löschen</button></div>';
  $("#choose-instance").addEventListener("click", async () => { state.selectedInstance = item.id; await persist(); renderInstances(); renderHome(); toast("Aktive Instanz geändert."); });
  $("#rename-instance").addEventListener("click", async () => { const name = prompt("Neuer Instanzname", item.name); if (name && name.trim()) { item.name = name.trim().slice(0, 36); await persist(); renderInstances(); renderHome(); } });
  const changeVersion = document.createElement("button"); changeVersion.className = "secondary-button"; changeVersion.textContent = "Version ändern"; document.querySelector(".detail-actions").append(changeVersion);
  changeVersion.addEventListener("click", async () => { try { const data = await window.sbClient.versions(); const select = $("#version-select"); select.innerHTML = data.versions.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}${v === data.latest ? " · Neueste" : ""}</option>`).join(""); select.value = data.versions.includes(item.version) ? item.version : data.latest; $("#version-dialog").dataset.instance = item.id; $("#version-dialog").showModal(); } catch (error) { showMessage("Versionen nicht verfügbar", error.message); } });  $("#delete-instance").addEventListener("click", async () => { if (!confirm('Instanz "' + item.name + '" löschen?')) return; state.instances = state.instances.filter((value) => value.id !== item.id); state.selectedInstance = state.instances[0]?.id || ""; await persist(); renderInstances(); renderHome(); toast("Instanz gelöscht."); });
}

function renderSettings() {
  $("#toggle-list").innerHTML = settingsInfo.map(([key, title, description]) => '<div class="toggle-row"><div class="toggle-copy"><b>' + title + '</b><p>' + description + '</p></div><button class="toggle ' + (state.settings[key] ? "on" : "") + '" role="switch" aria-checked="' + Boolean(state.settings[key]) + '" data-setting="' + key + '" aria-label="' + title + ' umschalten"></button></div>').join("");
  document.querySelectorAll(".toggle[data-setting]").forEach((button) => button.addEventListener("click", async () => {
    const key = button.dataset.setting;
    state.settings[key] = !state.settings[key];
    if (state.settings.vanillaPlus) state.settings.fullbright = false;
    await persist(); renderSettings();
  }));
}
function showMessage(title, body) { $("#message-title").textContent = title; $("#message-body").textContent = body; $("#message-dialog").showModal(); }

document.querySelectorAll(".nav-item[data-view]").forEach((button) => button.addEventListener("click", () => go(button.dataset.view)));
document.querySelectorAll("[data-goto]").forEach((button) => button.addEventListener("click", () => go(button.dataset.goto)));
$("#new-instance").addEventListener("click", () => { $("#instance-form").reset(); $("#instance-dialog").showModal(); });
$("#instance-form").addEventListener("submit", async (event) => {
  if (event.submitter?.value === "cancel") { $("#instance-dialog").close(); return; }
  event.preventDefault();
  const name = $("#instance-name").value.trim();
  if (!name) { $("#instance-name").setCustomValidity("Bitte gib einen Instanznamen ein."); $("#instance-name").reportValidity(); return; }
  $("#instance-name").setCustomValidity("");
  const item = { id: crypto.randomUUID(), name, version: $("#instance-version").value, loader: $("#instance-loader").value };
  state.instances.push(item); state.selectedInstance = item.id; await persist(); $("#instance-dialog").close(); renderInstances(); renderHome(); toast("Instanz wurde erstellt.");
});
$("#play-button").addEventListener("click", () => showMessage("Minecraft-Verbindung fehlt", "Der Launcher kann Minecraft noch nicht installieren oder starten. Microsoft-Anmeldung, Java-Prüfung und sicherer Minecraft-Start folgen als nächster Ausbauschritt."));
$("#login-button").addEventListener("click", async () => { if (signedInProfile) { if (confirm("Microsoft-Konto abmelden?")) { await window.sbClient.logoutMicrosoft(); signedInProfile = null; renderMicrosoftProfile(); toast("Abgemeldet."); } return; } if (await window.sbClient.hasMicrosoftClientId()) launchMicrosoftSignIn(); else $("#client-id-dialog").showModal(); });
$("#notice-login").addEventListener("click", () => $("#login-button").click());
$("#message-close").addEventListener("click", () => $("#message-dialog").close());
$("#message-ok").addEventListener("click", () => $("#message-dialog").close());

async function init() {
  if (window.sbClient) state = await window.sbClient.readState();
  renderHome();
  signedInProfile = await window.sbClient.getMicrosoftProfile().catch(() => null); renderMicrosoftProfile();
}
init();





$("#instance-name").addEventListener("input", () => $("#instance-name").setCustomValidity(""));
$("#version-form").addEventListener("submit", async event => { if (event.submitter?.value === "cancel") { $("#version-dialog").close(); return; } event.preventDefault(); const id = $("#version-dialog").dataset.instance; const instance = state.instances.find(x => x.id === id); if (!instance) return $("#version-dialog").close(); instance.version = $("#version-select").value; await persist(); $("#version-dialog").close(); renderInstances(); renderHome(); toast("Minecraft-Version geändert."); });




function renderMicrosoftProfile() {
  $("#login-button .avatar").textContent = signedInProfile?.name?.slice(0,1)?.toUpperCase() || "?";
  $("#login-button .login-copy").innerHTML = signedInProfile ? `<b>${escapeHtml(signedInProfile.name)}</b><small>Microsoft verbunden · abmelden</small>` : "<b>Gast</b><small>Microsoft verbinden</small>";
}
async function launchMicrosoftSignIn() {
  try {
    const flow = await window.sbClient.startMicrosoftLogin();
    $("#device-code").textContent = flow.userCode;
    $("#auth-status").textContent = "Warte auf die Bestätigung in deinem Browser …";
    $("#auth-dialog").showModal();
    clearInterval(launchMicrosoftSignIn.timer);
    launchMicrosoftSignIn.timer = setInterval(async () => {
      try {
        const result = await window.sbClient.pollMicrosoftLogin();
        if (result.pending) return;
        clearInterval(launchMicrosoftSignIn.timer); $("#auth-dialog").close(); signedInProfile = result.profile; renderMicrosoftProfile(); toast("Minecraft-Konto verbunden.");
      } catch (error) { clearInterval(launchMicrosoftSignIn.timer); $("#auth-dialog").close(); showMessage("Anmeldung fehlgeschlagen", error.message); }
    }, Math.max(5, flow.interval) * 1000);
    await window.sbClient.openMicrosoftVerification();
  } catch (error) { showMessage("Microsoft-Anmeldung", error.message); }
}
$("#client-id-form").addEventListener("submit", async event => {
  if (event.submitter?.value === "cancel") { $("#client-id-dialog").close(); return; }
  event.preventDefault(); const id = $("#microsoft-client-id").value.trim();
  try { await window.sbClient.setMicrosoftClientId(id); $("#client-id-dialog").close(); await launchMicrosoftSignIn(); }
  catch (error) { showMessage("Client-ID prüfen", error.message); }
});
$("#microsoft-client-id").addEventListener("input", () => $("#microsoft-client-id").setCustomValidity(""));
$("#auth-cancel").addEventListener("click", async () => { clearInterval(launchMicrosoftSignIn.timer); await window.sbClient.cancelMicrosoftLogin(); $("#auth-dialog").close(); });
$("#open-microsoft").addEventListener("click", () => window.sbClient.openMicrosoftVerification());



