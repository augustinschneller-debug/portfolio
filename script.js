/* ===================== Outils ===================== */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function store(key, value) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    localStorage.setItem(key, value);
  } catch (e) { return null; }
}

function escapeHtml(str) {
  return str.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

/* ===================== Thème ===================== */
const root = document.documentElement;
const savedTheme = store("theme");
if (savedTheme) root.dataset.theme = savedTheme;
else if (window.matchMedia("(prefers-color-scheme: light)").matches) root.dataset.theme = "light";

$("#themeToggle").addEventListener("click", () => {
  const next = root.dataset.theme === "light" ? "dark" : "light";
  root.dataset.theme = next;
  store("theme", next);
});

/* ===================== Navigation ===================== */
const nav = $("#nav");
const progress = $("#progress");
const burger = $("#burger");
const navLinks = $("#navLinks");

window.addEventListener("scroll", () => {
  nav.classList.toggle("scrolled", window.scrollY > 30);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  progress.style.width = (max > 0 ? (window.scrollY / max) * 100 : 0) + "%";
}, { passive: true });

burger.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  burger.setAttribute("aria-expanded", open);
});
$$("#navLinks a").forEach(a => a.addEventListener("click", () => {
  navLinks.classList.remove("open");
  burger.setAttribute("aria-expanded", "false");
}));

// Lien actif selon la section visible
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    $$("#navLinks a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + entry.target.id));
  });
}, { rootMargin: "-45% 0px -50% 0px" });
$$("main section[id]").forEach(s => sectionObserver.observe(s));

/* ===================== Texte tapé ===================== */
const phrases = [
  "python serveur_lancer.py --port 5555",
  "curl -s -o /dev/null -w \"%{http_code}\" monsite.fr",
  "pio run -t upload  # ESP32",
  "pytest -v tests/",
  "ssh seoultech-2027",
];
const typedEl = $("#typed");
let phraseIdx = 0, charIdx = 0, deleting = false;

function typeLoop() {
  const phrase = phrases[phraseIdx];
  typedEl.textContent = phrase.slice(0, charIdx);
  if (!deleting && charIdx < phrase.length) { charIdx++; setTimeout(typeLoop, 55); }
  else if (!deleting) { deleting = true; setTimeout(typeLoop, 1800); }
  else if (charIdx > 0) { charIdx--; setTimeout(typeLoop, 25); }
  else { deleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; setTimeout(typeLoop, 300); }
}
if (reduceMotion) typedEl.textContent = phrases[0]; else typeLoop();

/* ===================== Compteurs ===================== */
function animateCount(el) {
  const target = +el.dataset.count;
  if (reduceMotion) { el.textContent = target; return; }
  const start = performance.now();
  const step = now => {
    const t = Math.min((now - start) / 1400, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3)));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
$$("[data-count]").forEach(animateCount);

/* ===================== Fond réseau animé ===================== */
(function networkBackground() {
  const canvas = $("#netCanvas");
  const ctx = canvas.getContext("2d");
  let w, h, nodes = [], packets = [];
  const mouse = { x: -999, y: -999 };

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(70, Math.floor((w * h) / 18000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35,
    }));
    packets = [];
  }

  function colors() {
    const s = getComputedStyle(root);
    return { a: s.getPropertyValue("--accent").trim(), b: s.getPropertyValue("--accent-2").trim() };
  }

  const LINK = 140;
  let running = false;
  function start() { if (!running) { running = true; requestAnimationFrame(frame); } }
  function frame() {
    running = false;
    const { a, b } = colors();
    ctx.clearRect(0, 0, w, h);

    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < 0 || n.x > w) n.vx *= -1;
      if (n.y < 0 || n.y > h) n.vy *= -1;
      const dx = n.x - mouse.x, dy = n.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 120) { n.x += dx / d; n.y += dy / d; }
    }

    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const p = nodes[i], q = nodes[j];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < LINK) {
          ctx.globalAlpha = (1 - d / LINK) * .35;
          ctx.strokeStyle = b;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          if (Math.random() < .0008 && packets.length < 12) packets.push({ p, q, t: 0 });
        }
      }
    }

    ctx.globalAlpha = .9;
    ctx.fillStyle = b;
    for (const n of nodes) { ctx.beginPath(); ctx.arc(n.x, n.y, 2, 0, Math.PI * 2); ctx.fill(); }

    ctx.fillStyle = a;
    packets = packets.filter(pk => {
      pk.t += .015;
      const x = pk.p.x + (pk.q.x - pk.p.x) * pk.t, y = pk.p.y + (pk.q.y - pk.p.y) * pk.t;
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      return pk.t < 1;
    });
    ctx.globalAlpha = 1;
    if (!document.hidden && !reduceMotion) start();
  }

  window.addEventListener("resize", () => { resize(); if (reduceMotion) start(); });
  canvas.parentElement.addEventListener("mousemove", e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
  });
  canvas.parentElement.addEventListener("mouseleave", () => { mouse.x = mouse.y = -999; });
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !reduceMotion) start(); });

  resize();
  start();
})();

/* ===================== Apparition au scroll ===================== */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add("visible"); revealObserver.unobserve(entry.target); }
  });
}, { threshold: .12 });
$$(".reveal").forEach(el => revealObserver.observe(el));

/* ===================== Filtres projets ===================== */
$$(".filter").forEach(btn => btn.addEventListener("click", () => {
  $$(".filter").forEach(b => b.classList.toggle("active", b === btn));
  const f = btn.dataset.filter;
  $$(".card").forEach(card => {
    const show = f === "all" || card.dataset.tags.split(" ").includes(f);
    card.classList.toggle("hidden", !show);
  });
}));

/* Inclinaison 3D des cartes */
if (!reduceMotion && window.matchMedia("(hover: hover)").matches) {
  $$(".card").forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      card.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
}

/* ===================== Widgets des cartes ===================== */
// Thermomètre : valeur qui varie comme si la page interrogeait /data.json
const thermoValue = $("#thermoValue");
let temp = 26.4;
setInterval(() => {
  temp = Math.min(29, Math.max(24, temp + (Math.random() - .5) * .3));
  thermoValue.textContent = temp.toFixed(1);
}, 1000);

// Mini-terminal de surveillance
const miniTerm = $("#miniTerm");
const termLines = [];
function pushTermLine() {
  const now = new Date();
  const hh = now.toTimeString().slice(0, 8);
  const down = Math.random() < .2;
  const code = down ? ["000", "503", "522"][Math.floor(Math.random() * 3)] : ["200", "200", "301"][Math.floor(Math.random() * 3)];
  termLines.push(`[${hh}] HTTP <span class="${down ? "ko" : "ok"}">${code}</span> ${down ? "indisponible" : "en ligne"}`);
  if (termLines.length > 7) termLines.shift();
  miniTerm.innerHTML = "$ ./surveille-site.sh\n" + termLines.join("\n");
}
pushTermLine();
setInterval(pushTermLine, 2200);

/* ===================== Modale projets ===================== */
const projects = {
  speeddeath: {
    title: "SpeedDeath",
    meta: "Projet de groupe J3D · 5 personnes · Mai 2026",
    html: `
      <p>Jeu de plateforme multijoueur en Python/pygame. Le joueur 1 traverse le niveau, le joueur 2 pose des pièges en temps réel depuis un autre PC du même réseau local.</p>
      <h4>Mon rôle</h4>
      <ul>
        <li>J'ai écrit le serveur TCP utilisé par le jeu (<code>serveur_lancer.py</code>, 134 lignes sur 148).</li>
        <li>J'ai écrit la conversion des coordonnées entre les deux écrans (<code>network_coords.py</code>).</li>
        <li>J'ai intégré le serveur au cycle de vie du jeu : démarrage, arrêt propre, remise à zéro entre deux parties.</li>
      </ul>
      <h4>Architecture</h4>
      <pre>PC J1 (joueur)                          PC J2 (piégeur)
 ├─ thread serveur  TCP 0.0.0.0:5555     │
 │    └─ 1 thread par client  ◀── TCP ───┤ NetworkClient(ip_J1, 5555)
 └─ NetworkClient("127.0.0.1", 5555)</pre>
      <h4>Le protocole</h4>
      <p>Une ligne JSON par message, terminée par <code>\\n</code>. TCP transporte un flux d'octets, pas des messages : un tampon reconstitue chaque ligne avant de la traiter.</p>
      <div class="table-wrap"><table>
        <tr><th>Type</th><th>Sens</th><th>Effet</th></tr>
        <tr><td><code>player_pos</code></td><td>J1 → J2</td><td>Position et résolution d'écran</td></tr>
        <tr><td><code>add</code> / <code>remove</code></td><td>J2 → J1</td><td>Pose ou retrait d'un piège</td></tr>
        <tr><td><code>full_level</code></td><td>serveur → nouveau client</td><td>État complet du niveau à la connexion</td></tr>
        <tr><td><code>game_result</code></td><td>J1 → J2</td><td>Victoire ou défaite et score</td></tr>
        <tr><td><code>reset_game</code></td><td>serveur → tous</td><td>Remise à zéro entre deux parties</td></tr>
      </table></div>
      <h4>Ce que j'ai appris</h4>
      <ul>
        <li>La différence entre <code>0.0.0.0</code>, <code>127.0.0.1</code> et l'IP du réseau local.</li>
        <li>Threads, <code>queue.Queue</code>, <code>Event</code> et <code>Lock</code> pour séparer le réseau de la boucle de jeu.</li>
        <li>Un client qui arrive doit recevoir l'état courant, pas seulement les événements futurs.</li>
      </ul>
      <h4>Limites identifiées</h4>
      <ul>
        <li>Listes partagées sans verrou côté serveur, <code>except:</code> trop larges.</li>
        <li>Pas d'authentification ni de <em>heartbeat</em>, réseau local uniquement.</li>
      </ul>
      <div class="tags"><span>Python</span><span>pygame</span><span>socket</span><span>threading</span><span>JSON</span></div>`,
  },
  thermo: {
    title: "Thermomètre piscine Wi-Fi",
    meta: "Projet embarqué personnel · ESP32",
    html: `
      <p>Une sonde DS18B20 mesure la température de la piscine. L'ESP32 sert les mesures sur le réseau local et les envoie dans une base de données cloud. J'ai adapté le projet open source <strong>ToMe25/ESP-WiFi-Thermometer</strong> (licence MIT).</p>
      <h4>Architecture</h4>
      <pre>DS18B20 ──OneWire──▶ ESP32 ──Wi-Fi──▶ box (LAN)
                       │                ├─▶ navigateur : HTTP GET :80   (ESP32 serveur)
                       │                └─▶ Internet : HTTPS ▶ InfluxDB (ESP32 client)
                       └─ échec Wi-Fi : point d'accès "ESP-WIFI-MANAGER" + formulaire</pre>
      <h4>Mon rôle</h4>
      <ul>
        <li>Intégration d'un gestionnaire Wi-Fi : si la connexion échoue après 10 s, l'ESP32 crée son propre point d'accès et sert un formulaire de configuration (HTTP POST).</li>
        <li>Ajout de l'envoi HTTPS vers InfluxDB Cloud, après synchronisation NTP pour valider le certificat.</li>
        <li>Interface web servie depuis la mémoire flash (SPIFFS), qui interroge <code>/data.json</code> chaque seconde.</li>
      </ul>
      <h4>Routes du serveur embarqué</h4>
      <div class="table-wrap"><table>
        <tr><th>Route</th><th>Réponse</th></tr>
        <tr><td><code>GET /</code></td><td>Page HTML avec la température</td></tr>
        <tr><td><code>GET /temperature</code></td><td><code>text/plain</code></td></tr>
        <tr><td><code>GET /data.json</code></td><td><code>application/json</code> + <code>Cache-Control: no-cache</code></td></tr>
        <tr><td><code>POST /</code> (config)</td><td>Enregistre SSID et mot de passe, puis redémarre</td></tr>
        <tr><td>route inconnue</td><td><code>404</code></td></tr>
      </table></div>
      <h4>Ce que j'ai appris</h4>
      <ul>
        <li>Un même équipement peut être serveur pour le réseau local et client pour Internet.</li>
        <li>Un objet connecté doit prévoir l'absence de réseau : délai, point d'accès de secours, reconnexion.</li>
        <li>Accès par nom grâce au mDNS : <code>esp-wifi-thermometer.local</code>.</li>
      </ul>
      <h4>Pistes d'amélioration</h4>
      <ul>
        <li>Envoyer vers le cloud toutes les 30 à 60 s au lieu de 500 ms.</li>
        <li>Sortir les secrets du code, protéger le point d'accès, activer le Deep Sleep.</li>
      </ul>
      <div class="tags"><span>C++</span><span>ESP32</span><span>PlatformIO</span><span>HTTP</span><span>HTTPS</span><span>NTP</span><span>mDNS</span><span>InfluxDB</span></div>`,
  },
  watch: {
    title: "Surveillance de site",
    meta: "Automatisation personnelle · Bash",
    html: `
      <p>Un script Bash que j'ai écrit entièrement. Il interroge une URL toutes les 60 secondes et prévient quand le site revient en ligne.</p>
      <h4>La commande au cœur du script</h4>
      <pre>curl -4 -L -s -o /dev/null -w "%{http_code}" \\
     --connect-timeout 10 --max-time 20 "$URL"</pre>
      <ul>
        <li><code>-4</code> force l'IPv4, <code>-L</code> suit les redirections.</li>
        <li><code>--connect-timeout</code> et <code>--max-time</code> séparent le délai de connexion du délai total.</li>
        <li><code>-w "%{http_code}"</code> ne garde que le code de réponse.</li>
      </ul>
      <h4>Interprétation</h4>
      <div class="table-wrap"><table>
        <tr><th>Code</th><th>Verdict</th></tr>
        <tr><td><code>2xx</code> / <code>3xx</code></td><td>Site disponible</td></tr>
        <tr><td><code>4xx</code> / <code>5xx</code> / <code>522</code></td><td>Site indisponible</td></tr>
        <tr><td><code>000</code></td><td>Aucune réponse HTTP : échec DNS, TCP ou TLS</td></tr>
      </table></div>
      <h4>Notifications</h4>
      <p>Au retour du site : e-mail, son et notification système (<code>notify-send</code>).</p>
      <div class="tags"><span>Bash</span><span>curl</span><span>HTTP</span><span>Linux</span></div>`,
  },
};

const modal = $("#modal");
const modalContent = $("#modalContent");
let lastFocus = null;

function openModal(key) {
  const p = projects[key];
  modalContent.innerHTML = `<p class="card-meta mono">${p.meta}</p><h3 id="modalTitle">${p.title}</h3>${p.html}`;
  lastFocus = document.activeElement;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  $(".modal-close", modal).focus();
}
function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (lastFocus) lastFocus.focus();
}
$$(".card").forEach(card => {
  card.addEventListener("click", () => openModal(card.dataset.project));
  card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(card.dataset.project); } });
});
$$("[data-close]", modal).forEach(el => el.addEventListener("click", closeModal));
document.addEventListener("keydown", e => { if (e.key === "Escape" && modal.classList.contains("open")) closeModal(); });

/* ===================== Labo : protocole SpeedDeath ===================== */
const diagram = $("#netDiagram");
const protoLog = $("#protoLog");
const nodesEl = { J1: $("#nodeJ1"), SRV: $("#nodeSrv"), J2: $("#nodeJ2") };
const level = [];
let px = 120, py = 540, j2Connected = false, logStarted = false;

function centerOf(el) {
  const d = diagram.getBoundingClientRect(), r = el.getBoundingClientRect();
  return r.left - d.left + r.width / 2;
}

function sendPacket(from, to, label) {
  return new Promise(resolve => {
    const pk = document.createElement("span");
    pk.className = "packet" + (from === "J2" ? " down" : "");
    pk.textContent = label;
    diagram.appendChild(pk);
    const x0 = centerOf(nodesEl[from]), x1 = centerOf(nodesEl[to]);
    const anim = pk.animate(
      [{ left: x0 + "px", opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .85 }, { left: x1 + "px", opacity: 0 }],
      { duration: reduceMotion ? 1 : 700, easing: "ease-in-out", fill: "forwards" }
    );
    anim.onfinish = () => {
      pk.remove();
      nodesEl[to].classList.add("flash");
      setTimeout(() => nodesEl[to].classList.remove("flash"), 300);
      resolve();
    };
  });
}

function jsonLine(obj) {
  return escapeHtml(JSON.stringify(obj))
    .replace(/&quot;(\w+)&quot;:/g, '<span class="k">"$1"</span>:')
    .replace(/:&quot;([^&]*)&quot;/g, ':<span class="s">"$1"</span>');
}

function log(dir, obj, note) {
  if (!logStarted) { protoLog.innerHTML = ""; logStarted = true; }
  const noteLine = note ? `<span class="muted">  # ${escapeHtml(note)}</span>\n` : "";
  protoLog.insertAdjacentHTML("beforeend", `<span class="t">${dir}</span> ${jsonLine(obj)}\n${noteLine}`);
  protoLog.scrollTop = protoLog.scrollHeight;
}

const actions = {
  async connect() {
    if (j2Connected) { log("J2", { info: "déjà connecté" }, "une seule connexion suffit"); return; }
    log("J2 → SRV", { connect: "192.168.1.42:5555" }, "accept() crée un thread pour ce client");
    await sendPacket("J2", "SRV", "SYN");
    j2Connected = true;
    const msg = { type: "full_level", objects: level.slice() };
    log("SRV → J2", msg, "le nouveau client reçoit l'état complet du niveau");
    await sendPacket("SRV", "J2", "full_level");
  },
  async player_pos() {
    px += Math.round(Math.random() * 120); py -= Math.round(Math.random() * 40);
    const msg = { type: "player_pos", x: px, y: py, res: [1920, 1080] };
    log("J1 → SRV", msg);
    await sendPacket("J1", "SRV", "player_pos");
    if (!j2Connected) { log("SRV", { info: "aucun autre client" }, "broadcast(msg, exclude=J1) : personne à prévenir"); return; }
    log("SRV → J2", msg, "relais à tous sauf l'émetteur, coordonnées converties côté J2");
    await sendPacket("SRV", "J2", "player_pos");
  },
  async add() {
    if (!j2Connected) { log("J2", { erreur: "non connecté" }, "connectez d'abord J2"); return; }
    const obj = { kind: "spike", x: 300 + level.length * 64, y: 600 };
    level.push(obj);
    const msg = { type: "add", obj };
    log("J2 → SRV", msg, "le serveur met à jour sa liste de pièges");
    await sendPacket("J2", "SRV", "add");
    log("SRV → J1", msg);
    await sendPacket("SRV", "J1", "add");
  },
  async remove() {
    if (!j2Connected) { log("J2", { erreur: "non connecté" }, "connectez d'abord J2"); return; }
    if (!level.length) { log("J2", { info: "aucun piège" }, "rien à retirer"); return; }
    const obj = level.pop();
    const msg = { type: "remove", obj };
    log("J2 → SRV", msg);
    await sendPacket("J2", "SRV", "remove");
    log("SRV → J1", msg);
    await sendPacket("SRV", "J1", "remove");
  },
  async game_result() {
    const msg = { type: "game_result", win: Math.random() > .5, score: Math.floor(Math.random() * 9000) + 1000 };
    log("J1 → SRV", msg);
    await sendPacket("J1", "SRV", "game_result");
    if (j2Connected) await sendPacket("SRV", "J2", "game_result");
  },
  async reset_game() {
    level.length = 0; px = 120; py = 540;
    log("SRV → *", { type: "reset_game" }, "file + Event : le jeu attend la fin du reset");
    await Promise.all([sendPacket("SRV", "J1", "reset_game"), j2Connected ? sendPacket("SRV", "J2", "reset_game") : null]);
  },
};

let busy = false;
$$(".chip[data-msg]").forEach(btn => btn.addEventListener("click", async () => {
  if (busy) return;
  busy = true;
  try { await actions[btn.dataset.msg](); } finally { busy = false; }
}));

/* ===================== Labo : codes HTTP ===================== */
const verdicts = {
  "200": ["up", "✓", "Site disponible", "200 OK : le serveur a répondu normalement."],
  "301": ["up", "✓", "Site disponible", "301 : redirection permanente. Avec -L, curl suit la redirection : le site est considéré comme en ligne."],
  "404": ["down", "✕", "Site indisponible", "404 : le serveur répond, mais la page demandée n'existe pas."],
  "503": ["down", "✕", "Site indisponible", "503 : service temporairement indisponible (maintenance, surcharge)."],
  "522": ["down", "✕", "Site indisponible", "522 : le proxy (Cloudflare) n'a pas pu joindre le serveur d'origine."],
  "000": ["none", "!", "Aucune réponse HTTP", "000 : curl n'a reçu aucune réponse. Échec DNS, connexion TCP refusée, délai dépassé ou erreur TLS."],
};
const verdict = $("#verdict");
$$(".code-btn").forEach(btn => btn.addEventListener("click", () => {
  $$(".code-btn").forEach(b => b.classList.toggle("active", b === btn));
  const [cls, icon, title, text] = verdicts[btn.dataset.code];
  verdict.className = "verdict " + cls;
  void verdict.offsetWidth;
  verdict.classList.add("pop");
  $("#verdictIcon").textContent = icon;
  $("#verdictTitle").textContent = title;
  $("#verdictText").textContent = text;
}));

/* ===================== Onglets compétences ===================== */
$$(".tab").forEach(tab => tab.addEventListener("click", () => {
  $$(".tab").forEach(t => t.classList.toggle("active", t === tab));
  $$(".tab-panel").forEach(p => p.classList.toggle("active", p.id === "tab-" + tab.dataset.tab));
}));

/* ===================== Contact ===================== */
const toast = $("#toast");
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => toast.classList.remove("show"), 2200);
}
$("#copyMail").addEventListener("click", async e => {
  const mail = e.currentTarget.dataset.mail;
  try {
    await navigator.clipboard.writeText(mail);
    showToast("Adresse copiée ✓");
  } catch {
    window.location.href = "mailto:" + mail;
  }
});

$("#year").textContent = new Date().getFullYear();
