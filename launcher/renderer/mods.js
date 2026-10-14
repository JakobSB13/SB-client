async function renderMods() {
  const instance = activeInstance(), type = document.querySelector("#content-type").value;
  document.querySelector("#mods-instance-label").textContent = instance ? `${instance.name} · Minecraft ${instance.version} · ${instance.loader}` : "Erstelle zuerst eine Instanz.";
  document.querySelector("#curseforge-key-box").hidden = document.querySelector("#mods-provider").value !== "curseforge" || type !== "mod";
  if (!instance) { document.querySelector("#installed-mods").textContent = "Keine Instanz ausgewählt."; return; }
  const items = type === "mod" ? await window.sbClient.listMods(instance.id) : await window.sbClient.listContents({id:instance.id, contentType:type});
  const kind = type === "mod" ? "Mods" : type === "shader" ? "Shader" : "Resourcepacks";
  document.querySelector("#installed-mods").textContent = items.length ? items.join(" · ") : `Noch keine ${kind} installiert.`;
}
document.querySelector("#mods-provider").addEventListener("change", () => { if(document.querySelector("#content-type").value!=="mod") document.querySelector("#content-type").value="mod"; renderMods(); });
document.querySelector("#content-type").addEventListener("change", () => { if (document.querySelector("#content-type").value !== "mod") document.querySelector("#mods-provider").value = "modrinth"; renderMods(); });
document.querySelector("#mods-search").addEventListener("click", async () => {
  const instance = activeInstance(), query = document.querySelector("#mods-query").value.trim(), box = document.querySelector("#mods-results"), contentType = document.querySelector("#content-type").value;
  if (!instance) return showMessage("Keine Instanz", "Erstelle zuerst eine Instanz.");
  if (!query) return toast("Gib einen Suchbegriff ein.");
  box.innerHTML = '<div class="empty-state">Suche passende Inhalte …</div>';
  try {
    const provider = document.querySelector("#mods-provider").value;
    const results = await window.sbClient.searchMods({provider, query, instance, contentType});
    box.innerHTML = results.length ? results.map(m => `<div class="mod-result">${m.icon ? `<img src="${escapeHtml(m.icon)}" alt="">` : '<span class="quick-icon">◇</span>'}<div class="mod-info"><b>${escapeHtml(m.name)}</b><small>${escapeHtml((m.description || "").slice(0,150))} · ${Number(m.downloads||0).toLocaleString("de-DE")} Downloads</small></div><button class="secondary-button install-mod" data-id="${escapeHtml(m.id)}">Installieren</button></div>`).join("") : '<div class="empty-state">Keine passenden Inhalte gefunden.</div>';
    box.querySelectorAll(".install-mod").forEach(button => button.addEventListener("click", async () => {
      button.disabled = true; button.textContent = "Lädt …";
      try { const filename = await window.sbClient.installMod({provider, projectId:button.dataset.id, instance, contentType}); toast(filename + " installiert."); await renderMods(); }
      catch (error) { showMessage("Installation fehlgeschlagen", error.message); }
      finally { button.disabled = false; button.textContent = "Installieren"; }
    }));
  } catch (error) { box.innerHTML = ""; showMessage("Suche fehlgeschlagen", error.message); }
});document.querySelector("#save-cf-key").addEventListener("click", async () => {
  try { await window.sbClient.setCurseForgeKey(document.querySelector("#curseforge-key").value); document.querySelector("#curseforge-key").value = ""; toast("API-Schlüssel sicher gespeichert."); }
  catch (error) { showMessage("Schlüssel nicht gespeichert", error.message); }
});
(async () => {
  try {
    const data = await window.sbClient.versions();
    const select = document.querySelector("#instance-version");
    select.innerHTML = data.versions.map(v => `<option value="${escapeHtml(v)}">${escapeHtml(v)}${v === data.latest ? " · Neueste Version" : ""}</option>`).join("");
    select.value = data.latest;
  } catch { document.querySelector("#instance-version").innerHTML = '<option value="1.21.10">1.21.10</option>'; }
})();
const friendList = document.querySelector("#friend-list");
function renderFriends() {
  const friends = Array.isArray(state.friends) ? state.friends : [];
  friendList.innerHTML = friends.length ? friends.map((name,index) => `<div class="friend-row"><span class="avatar">${escapeHtml(name.slice(0,1).toUpperCase())}</span><div class="friend-copy"><b>${escapeHtml(name)}</b><small>Offline · lokal gespeichert</small></div><button class="danger-button remove-friend" data-index="${index}">Entfernen</button></div>`).join("") : '<div class="empty-state">Noch keine Freunde gespeichert.</div>';
  friendList.querySelectorAll(".remove-friend").forEach(button => button.addEventListener("click", async () => { state.friends.splice(Number(button.dataset.index),1); await persist(); renderFriends(); }));
}
document.querySelector("#add-friend").addEventListener("click", async () => {
  const input = document.querySelector("#friend-name"), name = input.value.trim();
  if (!name) { input.focus(); input.setCustomValidity("Bitte gib einen Spielernamen ein."); input.reportValidity(); return; }
  input.setCustomValidity("");
  if (!/^[A-Za-z0-9_]{1,16}$/.test(name)) { input.setCustomValidity("Minecraft-Namen dürfen 1–16 Zeichen lang sein und Buchstaben, Zahlen oder _ enthalten."); input.reportValidity(); return; }
  if (state.friends.some(friend => friend.toLowerCase() === name.toLowerCase())) return toast("Dieser Name ist schon in deiner Liste.");
  state.friends.push(name); await persist(); input.value = ""; renderFriends(); toast("Freund lokal gespeichert.");
});



