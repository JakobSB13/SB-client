const villagerGuides = [
 ["Bauer", "Komposter", "Lebensmittel, Samen, Feldfrüchte und verzauberte Bücher"],
 ["Fischer", "Fass", "Fische, Angeln und Boote"],
 ["Pfeilmacher", "Bognertisch", "Pfeile, Bögen, Armbrüste und Stöcke"],
 ["Schäfer", "Webstuhl", "Wolle, Teppiche, Betten, Banner und Scheren"],
 ["Bibliothekar", "Lesepult", "Bücher, Papier, Namensschilder und verzauberte Bücher"],
 ["Kartograf", "Kartentisch", "Karten, Rahmen, Banner und Entdeckerkarten"],
 ["Priester", "Braustand", "Redstone-Staub, Lapislazuli, Enderperlen und Brauzutaten"],
 ["Rüstungsschmied", "Schmelzofen", "Rüstung, Schilde und Glocken"],
 ["Waffenschmied", "Schleifstein", "Äxte, Schwerter und verzauberte Waffen"],
 ["Werkzeugschmied", "Schmiedetisch", "Werkzeuge und verzauberte Werkzeuge"],
 ["Metzger", "Räucherofen", "Fleisch, Eintopf und süße Beeren"],
 ["Lederer", "Kessel", "Lederrüstung, Sättel und Lederwaren"],
 ["Steinmetz", "Steinsäge", "Steinblöcke, Ziegel, Terrakotta und Quarz"],
 ["Arbeitslos", "Kein Block", "Kann einen freien Beruf annehmen."],
 ["Nichtsnutz", "Kein Beruf", "Nimmt keinen Beruf an und handelt nicht."]
];
const brewingGuides = [
 ["Grundtrank", "Wasserflasche + Netherwarze", "Basis für die meisten Tränke"],
 ["Nachtsicht", "Grundtrank + Goldene Karotte", "Bessere Sicht im Dunkeln"],
 ["Unsichtbarkeit", "Nachtsichttrank + Fermentiertes Spinnenauge", "Unsichtbarkeit; Rüstung bleibt sichtbar"],
 ["Feuerresistenz", "Grundtrank + Magmacreme", "Schutz vor Feuer und Lava"],
 ["Wasseratmung", "Grundtrank + Kugelfisch", "Unter Wasser atmen"],
 ["Sprungkraft", "Grundtrank + Hasenpfote", "Höher springen"],
 ["Schnelligkeit", "Grundtrank + Zucker", "Schneller laufen"],
 ["Langsamkeit", "Schnelligkeitstrank + Fermentiertes Spinnenauge", "Bewegung verlangsamen"],
 ["Stärke", "Grundtrank + Lohenstaub", "Nahkampfschaden erhöhen"],
 ["Heilung", "Grundtrank + Glitzernde Melonenscheibe", "Sofortige Heilung"],
 ["Schaden", "Heiltrank + Fermentiertes Spinnenauge", "Sofortiger Schaden"],
 ["Regeneration", "Grundtrank + Ghastträne", "Über Zeit heilen"],
 ["Gift", "Grundtrank + Spinnenauge", "Schaden über Zeit"],
 ["Schwäche", "Wasserflasche + Fermentiertes Spinnenauge", "Nahkampfschaden senken"],
 ["Turtle Master", "Grundtrank + Schildkrötenpanzer", "Starker Schutz mit verlangsamter Bewegung"],
 ["Verlängerung", "Trank + Redstone-Staub", "Wirkungsdauer verlängern"],
 ["Verstärkung", "Trank + Glowstone-Staub", "Effektstufe erhöhen; nicht mit Verlängerung kombinierbar"],
 ["Wurftrank", "Trank + Schießpulver", "Als Splash-Trank werfen"],
 ["Verweiltrank", "Wurftrank + Drachenatem", "Wirkungswolke am Zielort erzeugen"]
];
function renderGuides() {
  const type = document.querySelector("#guide-type").value, query = document.querySelector("#guide-search").value.trim().toLowerCase();
  const data = type === "villagers" ? villagerGuides : brewingGuides;
  const rows = data.filter(row => row.join(" ").toLowerCase().includes(query));
  document.querySelector("#guide-results").innerHTML = rows.length ? rows.map(row => `<article class="guide-card"><span class="eyebrow">${escapeHtml(row[1])}</span><h3>${escapeHtml(row[0])}</h3><p>${escapeHtml(row[2])}</p></article>`).join("") : '<div class="empty-state">Keine passenden Einträge gefunden.</div>';
}
document.querySelector("#guide-type").addEventListener("change", renderGuides);
document.querySelector("#guide-search").addEventListener("input", renderGuides);
function resetHotbarEditor() { document.querySelector("#hotbar-id").value = ""; document.querySelector("#hotbar-name").value = ""; document.querySelector("#hotbar-category").value = ""; document.querySelector("#hotbar-items").value = ""; }
function renderHotbars() {
  const list = document.querySelector("#hotbar-list");
  list.innerHTML = state.hotbars.length ? state.hotbars.map(h => `<article class="content-tile"><span class="tile-status">${escapeHtml(h.category || "OHNE KATEGORIE")}</span><h3>${escapeHtml(h.name)}</h3><p>${h.items.map((item,i)=>`${i+1}. ${escapeHtml(item || "—")}`).join("<br>")}</p><button class="secondary-button edit-hotbar" data-id="${escapeHtml(h.id)}">Bearbeiten</button> <button class="danger-button delete-hotbar" data-id="${escapeHtml(h.id)}">Löschen</button></article>`).join("") : '<div class="empty-state">Noch keine Hotbars gespeichert.</div>';
  list.querySelectorAll(".edit-hotbar").forEach(button => button.addEventListener("click", () => { const h = state.hotbars.find(x => x.id === button.dataset.id); if (!h) return; document.querySelector("#hotbar-id").value=h.id; document.querySelector("#hotbar-name").value=h.name; document.querySelector("#hotbar-category").value=h.category; document.querySelector("#hotbar-items").value=h.items.join("\n"); document.querySelector("#hotbar-name").focus(); }));
  list.querySelectorAll(".delete-hotbar").forEach(button => button.addEventListener("click", async () => { state.hotbars=state.hotbars.filter(x=>x.id!==button.dataset.id); await persist(); renderHotbars(); toast("Hotbar gelöscht."); }));
}
document.querySelector("#hotbar-save").addEventListener("click", async () => {
  const name=document.querySelector("#hotbar-name"), category=document.querySelector("#hotbar-category").value.trim(), raw=document.querySelector("#hotbar-items").value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!name.value.trim()){name.setCustomValidity("Bitte gib der Hotbar einen Namen.");name.reportValidity();return;} name.setCustomValidity("");
  if(raw.length>9)return showMessage("Zu viele Slots","Eine Hotbar hat höchstens neun Einträge.");
  const id=document.querySelector("#hotbar-id").value, hotbar={id:id||crypto.randomUUID(),name:name.value.trim(),category,items:Array.from({length:9},(_,i)=>raw[i]||"")};
  const index=state.hotbars.findIndex(x=>x.id===id); if(index>=0)state.hotbars[index]=hotbar;else state.hotbars.push(hotbar);
  await persist(); resetHotbarEditor(); renderHotbars(); toast("Hotbar gespeichert.");
});
document.querySelector("#hotbar-name").addEventListener("input",()=>document.querySelector("#hotbar-name").setCustomValidity(""));
document.querySelector("#hotbar-reset").addEventListener("click",resetHotbarEditor);
document.querySelector("#hotbar-export").addEventListener("click",async()=>{const data=JSON.stringify(state.hotbars,null,2);try{await window.sbClient.copyText(data);toast("Hotbar-JSON in die Zwischenablage kopiert.")}catch{showMessage("JSON exportieren",data)}});
document.querySelector("#hotbar-import").addEventListener("click",async()=>{const input=prompt("Füge ein zuvor exportiertes Hotbar-JSON ein.");if(input===null)return;try{const parsed=JSON.parse(input);if(!Array.isArray(parsed)||parsed.some(h=>!h||typeof h.name!=="string"||!Array.isArray(h.items)))throw new Error();state.hotbars.push(...parsed.map(h=>({id:crypto.randomUUID(),name:h.name.slice(0,48),category:String(h.category||"").slice(0,32),items:h.items.slice(0,9).map(x=>String(x).slice(0,60))})));await persist();renderHotbars();toast("Hotbars importiert.")}catch{showMessage("Import fehlgeschlagen","Das JSON passt nicht zum Hotbar-Format.")}});
document.querySelector("#inspect-performance").addEventListener("click", async () => { const report=document.querySelector("#system-report"); report.textContent="System wird geprüft …"; try { const s=await window.sbClient.inspectSystem(); const ramAdvice=s.ram<8?"Empfehlung: 2 GB für Minecraft reservieren.":s.ram<16?"Empfehlung: etwa 4 GB für Minecraft reservieren.":"Empfehlung: 4–6 GB für Minecraft reservieren."; report.innerHTML=`<b>CPU:</b> ${escapeHtml(s.cpu)} (${s.threads} Threads)<br><b>RAM:</b> ${s.ram} GB · ${ramAdvice}<br><b>Grafik:</b> ${escapeHtml(s.gpu)}<br><b>Monitor:</b> ${escapeHtml(s.displays.join(", ")||"Nicht erkannt")}`; } catch(error) { report.textContent="Systemdaten konnten nicht gelesen werden: "+error.message; } });
