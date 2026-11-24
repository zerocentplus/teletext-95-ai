const App = {};

App.Storage = {
  get(key, defaultValue) {
    try {
      const val = JSON.parse(localStorage.getItem(key));
      return val !== null ? val : defaultValue;
    } catch (e) {
      return defaultValue;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      // swallow silently (SecurityError, QuotaExceeded, etc.)
    }
  }
};

// ─── App.Sound ────────────────────────────────────────────────────────────────

App.Sound = {
  enabled: false,
  ctx: null,
  init() {
    this.enabled = App.Storage.get('tt95_sound', false);
    document.getElementById('tt-sound-toggle').textContent =
      this.enabled ? 'SND ON' : 'SND OFF';
  },
  toggle() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e) { return; }
    }
    this.enabled = !this.enabled;
    App.Storage.set('tt95_sound', this.enabled);
    document.getElementById('tt-sound-toggle').textContent =
      this.enabled ? 'SND ON' : 'SND OFF';
  },
  beep(freq, dur) {
    if (!this.enabled || !this.ctx) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      gain.gain.value = 0.3;
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.frequency.value = freq;
      osc.start();
      osc.stop(this.ctx.currentTime + dur / 1000);
    } catch(e) {}
  },
  digitBeep() { this.beep(880, 80); },
  navBeep()   { this.beep(440, 120); }
};

// ─── App.Renderer ─────────────────────────────────────────────────────────────

App.Renderer = {
  escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },
  truncate(str) {
    return str.length > 40 ? str.slice(0, 39) + '\u2026' : str;
  },
  wrapText(str) {
    const tokens = String(str).split(/\s+/).filter(t => t.length > 0);
    const lines = [];
    let current = '';
    for (const token of tokens) {
      const word = token.length > 40 ? this.truncate(token) : token;
      if (!current) {
        current = word;
      } else if (current.length + 1 + word.length <= 40) {
        current += ' ' + word;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
    return lines.length ? lines : [''];
  },
  row(text, colorClass) {
    const cls = colorClass ? ` ${colorClass}` : '';
    return `<div class="tt-row${cls}">${text}</div>`;
  },
  renderPage(id, html) {
    const el = document.querySelector('#p' + id + ' .content');
    if (el) el.innerHTML = html;
    const sec = document.getElementById('p' + id);
    if (sec) sec.classList.remove('tt-fallback');
  },
  renderFallback(id, html) {
    const el = document.querySelector('#p' + id + ' .content');
    if (el) el.innerHTML = html;
    const sec = document.getElementById('p' + id);
    if (sec) sec.classList.add('tt-fallback');
  }
};

// ─── App.Clock ────────────────────────────────────────────────────────────────

App.Clock = {
  tick() {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const date = `${pad(now.getDate())} ${months[now.getMonth()]} ${now.getFullYear()}`;
    const te = document.getElementById('tt-clock');
    if (te) te.textContent = time;
    const de = document.getElementById('tt-date');
    if (de) de.textContent = date;
    // Also stamp the header
    const pe = document.getElementById('tt-page-number');
    if (pe && !pe._manualSet) {
      // keep page number display, just update time in header if element exists
    }
  },
  start() {
    this.tick();
    setInterval(() => this.tick(), 1000);
  }
};

// ─── safeFetch ────────────────────────────────────────────────────────────────

async function safeFetch(url, options, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, ...options });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// ─── App.Router ───────────────────────────────────────────────────────────────

App.Router = {
  pages: [100, 200, 300, 400, 500],
  currentPage: null,
  subsystems: {},
  navigateTo(pageNum) {
    if (!this.pages.includes(pageNum)) {
      this.showError('PAGE ' + pageNum + ' NOT FOUND'); return;
    }
    // teardown current
    if (this.currentPage && this.subsystems[this.currentPage]) {
      const sub = this.subsystems[this.currentPage];
      if (typeof sub.teardown === 'function') sub.teardown();
    }
    // hide all, show target
    document.querySelectorAll('#tt-main section').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('p' + pageNum);
    if (target) target.classList.add('active');
    // update header
    document.getElementById('tt-page-number').textContent = 'P' + pageNum;
    this.currentPage = pageNum;
    App.Sound.navBeep();
    // init new page
    if (this.subsystems[pageNum] && typeof this.subsystems[pageNum].init === 'function') {
      this.subsystems[pageNum].init();
    }
  },
  showError(msg) {
    const html = App.Renderer.row('', 'tt-white') +
      App.Renderer.row('  *** ' + msg + ' ***', 'tt-red') +
      App.Renderer.row('', 'tt-white') +
      App.Renderer.row('  ENTER A VALID PAGE NUMBER:', 'tt-white') +
      App.Renderer.row('  P100  INDEX', 'tt-yellow') +
      App.Renderer.row('  P200  CRYPTO TICKER', 'tt-yellow') +
      App.Renderer.row('  P300  NEWS HEADLINES', 'tt-yellow') +
      App.Renderer.row('  P400  AI ORACLE', 'tt-yellow') +
      App.Renderer.row('  P500  TELEMETRY', 'tt-yellow');
    if (this.currentPage) App.Renderer.renderPage(this.currentPage, html);
  }
};

// ─── App.Navigator ────────────────────────────────────────────────────────────

App.Navigator = {
  buffer: [],
  handleDigit(d) {
    if (this.buffer.length >= 3) return;
    this.buffer.push(d);
    App.Sound.digitBeep();
    this.updateIndicator();
    if (this.buffer.length === 3) {
      const page = parseInt(this.buffer.join(''), 10);
      this.buffer = [];
      this.updateIndicator();
      App.Router.navigateTo(page);
    }
  },
  handleBack() {
    this.buffer = [];
    this.updateIndicator();
  },
  updateIndicator() {
    const slots = [
      this.buffer[0] !== undefined ? String(this.buffer[0]) : '_',
      this.buffer[1] !== undefined ? String(this.buffer[1]) : '_',
      this.buffer[2] !== undefined ? String(this.buffer[2]) : '_'
    ];
    document.getElementById('tt-digit-buffer').textContent = slots.join('');
  }
};

// ─── P100 — Index Page ────────────────────────────────────────────────────────

function initP100() {
  const R = App.Renderer;
  const pad = s => s.padEnd(40, ' ');
  const html = [
    R.row(pad('TELETEXT-95 AI'), 'tt-yellow tt-bold'),
    R.row(pad('KIROWEEN 2026 RESURRECTION SPECIAL'), 'tt-cyan'),
    R.row(pad(''), 'tt-white'),
    R.row(pad('  PAGE INDEX'), 'tt-white tt-bold'),
    R.row(pad('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'), 'tt-white'),
    R.row(pad('  P100  MAIN INDEX & SYSTEM CLOCK'), 'tt-green'),
    R.row(pad('  P200  LIVE CRYPTO MARKET TICKER'), 'tt-yellow'),
    R.row(pad('  P300  AI NEWS & TECH HEADLINES'), 'tt-cyan'),
    R.row(pad('  P400  INTERACTIVE AI ORACLE'), 'tt-magenta'),
    R.row(pad('  P500  WEATHER & SPACE TELEMETRY'), 'tt-white'),
    R.row(pad(''), 'tt-white'),
    R.row(pad('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'), 'tt-white'),
    R.row('  DATE: <span id="tt-date">-- --- ----</span>   TIME: <span id="tt-clock">--:--:--</span>', 'tt-white'),
    R.row(pad(''), 'tt-white'),
    R.row('  <span class="tt-yellow tt-blink">\u2605 RESURRECTED BY AI \u2605</span>', 'tt-white'),
    R.row(pad(''), 'tt-white'),
    R.row(pad('  USE NUMPAD OR REMOTE TO NAVIGATE'), 'tt-white'),
    R.row(pad('  FASTEXT BUTTONS: RED GREEN YEL BLU'), 'tt-white'),
    R.row(pad('  RED=P100 GREEN=P200 YEL=P300 BLU=P400'), 'tt-white'),
  ].join('');
  R.renderPage(100, html);
}

// ─── App.CryptoTicker — P200 ──────────────────────────────────────────────────

App.CryptoTicker = {
  intervalId: null,
  scrollId: null,
  cache: null,
  COINS: ['bitcoin','ethereum','solana','dogecoin','cardano'],
  SYMBOLS: { bitcoin:'BTC', ethereum:'ETH', solana:'SOL', dogecoin:'DOGE', cardano:'ADA' },
  async fetch() {
    const url = 'https://api.coingecko.com/api/v3/simple/price' +
      '?ids=bitcoin,ethereum,solana,dogecoin,cardano' +
      '&vs_currencies=usd&include_24hr_change=true';
    try {
      const data = await safeFetch(url);
      this.cache = data;
      this.render(data);
    } catch(e) {
      this.renderFallback();
    }
  },
  render(data) {
    const R = App.Renderer;
    const pad = s => s.padEnd(40, ' ');
    let html = R.row(pad('P200  LIVE CRYPTO MARKET TICKER'), 'tt-cyan tt-bold');
    html += R.row(pad('  DATA: COINGECKO  AUTO-REFRESH:60S'), 'tt-white');
    html += R.row(pad('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'), 'tt-white');
    html += R.row(pad('  COIN     PRICE USD     24H CHG'), 'tt-yellow');
    html += R.row(pad('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'), 'tt-white');
    for (const id of this.COINS) {
      const d = data[id];
      if (!d) continue;
      const sym = this.SYMBOLS[id].padEnd(6);
      const price = ('$' + d.usd.toFixed(2)).padStart(14);
      const chg = d.usd_24h_change;
      const sign = chg >= 0 ? '+' : '';
      const chgStr = (sign + chg.toFixed(2) + '%').padStart(10);
      const color = chg >= 0 ? 'tt-green' : 'tt-red';
      html += R.row(`  ${sym}${price}  <span class="${color}">${chgStr}</span>`, 'tt-white');
    }
    html += R.row(pad('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'), 'tt-white');
    html += R.row(pad('  PRICES IN USD \u2014 NOT FINANCIAL ADVICE'), 'tt-magenta');
    R.renderPage(200, html);
  },
  renderFallback() {
    const R = App.Renderer;
    const pad = s => s.padEnd(40, ' ');
    let html = R.row(pad('P200  CRYPTO TICKER \u2014 SIGNAL LOST'), 'tt-red tt-bold');
    if (this.cache) {
      html += R.row(pad('  SHOWING CACHED DATA'), 'tt-yellow');
      this.render(this.cache);
      return;
    }
    html += R.row(pad('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'), 'tt-white');
    html += R.row(pad('  COIN     PRICE USD     24H CHG'), 'tt-yellow');
    html += R.row(pad('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'), 'tt-white');
    html += R.row(pad('  BTC       $--,---.--      +-.--% '), 'tt-white');
    html += R.row(pad('  ETH        $-,---.--      -.--% '), 'tt-white');
    html += R.row(pad('  SOL          $---.--      +-.--% '), 'tt-white');
    html += R.row(pad('  NO NETWORK CONNECTION DETECTED'), 'tt-red');
    R.renderFallback(200, html);
  },
  init() {
    this.fetch();
    this.intervalId = setInterval(() => this.fetch(), 60000);
  },
  teardown() {
    clearInterval(this.intervalId);
    clearInterval(this.scrollId);
    this.intervalId = null;
    this.scrollId = null;
  }
};

// ─── App.NewsSynth — P300 ─────────────────────────────────────────────────────

App.NewsSynth = {
  intervalId: null,
  async fetch() {
    const url = 'https://hn.algolia.com/api/v1/search?tags=story&hitsPerPage=10';
    try {
      const data = await safeFetch(url);
      this.render(data.hits || []);
    } catch(e) {
      this.renderFallback();
    }
  },
  render(hits) {
    const R = App.Renderer;
    const pad = s => s.padEnd(40, ' ');
    let html = R.row(pad('P300  AI NEWS & TECH HEADLINES'), 'tt-cyan tt-bold');
    html += R.row(pad('  SOURCED FROM HACKER NEWS'), 'tt-white');
    html += R.row(pad('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'), 'tt-white');
    hits.slice(0, 8).forEach((hit, i) => {
      const num = String(i + 1).padStart(2, '0');
      const title = R.escapeHtml(hit.title || 'NO TITLE');
      const lines = R.wrapText(title).slice(0, 2);
      const score = hit.points || hit.score || 0;
      html += R.row(`  ${num}. ${lines[0]}`, 'tt-cyan');
      if (lines[1]) html += R.row(`      ${lines[1]}`, 'tt-cyan');
      html += R.row(`      SCORE: ${score} PTS`, 'tt-yellow');
    });
    R.renderPage(300, html);
  },
  renderFallback() {
    const R = App.Renderer;
    const pad = s => s.padEnd(40, ' ');
    let html = R.row(pad('P300  SIGNAL LOST \u2014 CACHED DATA'), 'tt-red tt-bold');
    html += R.row(pad('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'), 'tt-white');
    const headlines = [
      'AI SURPASSES HUMAN BENCHMARK AGAIN',
      'NEW JS FRAMEWORK RELEASED (AGAIN)',
      'OPEN SOURCE PROJECT HITS 100K STARS',
      'WEBASSEMBLY LANDS IN ALL BROWSERS',
      'RUST TOPS DEVELOPER SURVEY 9TH YEAR'
    ];
    headlines.forEach((h, i) => {
      const num = String(i + 1).padStart(2, '0');
      html += R.row(`  ${num}. ${h}`, 'tt-cyan');
      html += R.row('      SCORE: --- PTS', 'tt-yellow');
    });
    html += R.row(pad('  NO NETWORK \u2014 SHOWING PLACEHOLDER'), 'tt-red');
    R.renderFallback(300, html);
  },
  init() {
    this.fetch();
    this.intervalId = setInterval(() => this.fetch(), 300000);
  },
  teardown() {
    clearInterval(this.intervalId);
    this.intervalId = null;
  }
};

// ─── App.AIOracle — P400 ──────────────────────────────────────────────────────

App.AIOracle = {
  history: [],
  endpoint: '',
  apiKey: '',
  model: 'gpt-3.5-turbo',
  SYSTEM_PROMPT: 'You are TELETEXT-95 AI ORACLE, a 1990s British Teletext service resurrected with AI. ' +
    'Answer concisely in UPPERCASE. Keep each line under 36 characters. ' +
    'Use a formal, retro-broadcast tone. No markdown. Plain text only.',
  async callEndpoint(q) {
    if (!this.endpoint) throw new Error('NO ENDPOINT');
    const url = this.endpoint.replace(/\/$/, '') + '/v1/chat/completions';
    const data = await safeFetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + this.apiKey
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: this.SYSTEM_PROMPT },
          { role: 'user', content: q }
        ],
        max_tokens: 400
      })
    }, 15000);
    return data.choices[0].message.content;
  },
  async submitQuery(q) {
    if (!q.trim()) return;
    // Show waiting state
    const R = App.Renderer;
    let html = R.row('  ORACLE PROCESSING QUERY...', 'tt-white tt-blink');
    html += R.row('  PLEASE WAIT', 'tt-yellow');
    this.renderContent(html);
    try {
      const response = await this.callEndpoint(q);
      this.history.unshift({ query: q, response });
      this.history = this.history.slice(0, 3);
      this.renderHistory();
    } catch(e) {
      this.renderFallback(e.message);
    }
  },
  renderContent(html) {
    const R = App.Renderer;
    const pad = s => s.padEnd(40, ' ');
    let full = R.row(pad('P400  INTERACTIVE AI TELETEXT ORACLE'), 'tt-magenta tt-bold');
    full += R.row(pad('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'), 'tt-white');
    full += html;
    full += R.row(pad('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'), 'tt-white');
    full += this.renderInputLine();
    R.renderPage(400, full);
    this.bindInput();
  },
  renderInputLine() {
    return `<div class="tt-row tt-white">  &gt; <input id="tt-oracle-input" ` +
      `style="background:#000;color:#0f0;border:none;font-family:'Courier New',monospace;` +
      `font-size:1em;width:30ch;outline:none;" maxlength="80" placeholder="TYPE QUERY..."></div>`;
  },
  renderHistory() {
    const R = App.Renderer;
    const pad = s => String(s).padEnd(40, ' ');
    let html = '';
    if (this.history.length === 0) {
      html += R.row(pad('  ORACLE AWAITING YOUR QUERY...'), 'tt-white');
      html += R.row(pad('  TYPE A QUESTION AND PRESS ENTER'), 'tt-white');
    }
    this.history.forEach((entry, i) => {
      html += R.row(pad('  Q: ' + (entry.query || '').slice(0, 36)), 'tt-yellow');
      const lines = R.wrapText(entry.response || '');
      lines.slice(0, 4).forEach(line => {
        html += R.row('  ' + line, 'tt-white');
      });
      if (i < this.history.length - 1) {
        html += R.row(pad('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'), 'tt-white');
      }
    });
    this.renderContent(html);
  },
  renderFallback(msg) {
    const R = App.Renderer;
    const pad = s => s.padEnd(40, ' ');
    let html = R.row(pad('  ORACLE OFFLINE'), 'tt-red tt-bold');
    html += R.row(pad('  ' + (msg || 'CHECK ENDPOINT CONFIG').slice(0, 38)), 'tt-red');
    html += R.row(pad(''), 'tt-white');
    html += R.row(pad('  TO CONFIGURE AI ENDPOINT:'), 'tt-yellow');
    html += R.row(pad('  TYPE "config" AND PRESS ENTER'), 'tt-yellow');
    this.renderContent(html);
  },
  openSettings() {
    const ep = prompt('AI Endpoint URL (e.g. https://api.openai.com):', this.endpoint || '');
    if (ep !== null) { this.endpoint = ep.trim(); App.Storage.set('tt95_ai_endpoint', this.endpoint); }
    const key = prompt('API Key (leave blank to keep current):', '');
    if (key !== null && key.trim()) { this.apiKey = key.trim(); App.Storage.set('tt95_ai_key', this.apiKey); }
    const model = prompt('Model name:', this.model);
    if (model !== null && model.trim()) { this.model = model.trim(); App.Storage.set('tt95_ai_model', this.model); }
    this.renderHistory();
  },
  bindInput() {
    const inp = document.getElementById('tt-oracle-input');
    if (!inp || inp._bound) return;
    inp._bound = true;
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = inp.value.trim();
        inp.value = '';
        if (q.toLowerCase() === 'config') {
          this.openSettings();
        } else {
          this.submitQuery(q);
        }
      }
    });
    inp.focus();
  },
  init() {
    this.endpoint = App.Storage.get('tt95_ai_endpoint', '');
    this.apiKey   = App.Storage.get('tt95_ai_key', '');
    this.model    = App.Storage.get('tt95_ai_model', 'gpt-3.5-turbo');
    this.renderHistory();
  },
  teardown() {}
};

// ─── App.Telemetry — P500 ─────────────────────────────────────────────────────

App.Telemetry = {
  missionTimerId: null,
  EPOCH: new Date('1995-01-01T00:00:00Z'),
  formatMET(date) {
    const diff = Math.max(0, date - this.EPOCH);
    const totalSec = Math.floor(diff / 1000);
    const days = Math.floor(totalSec / 86400);
    const hours = Math.floor((totalSec % 86400) / 3600);
    const mins  = Math.floor((totalSec % 3600) / 60);
    const secs  = totalSec % 60;
    const p2 = n => String(n).padStart(2, '0');
    const p3 = n => String(n).padStart(3, '0');
    return `${p3(days)}:${p2(hours)}:${p2(mins)}:${p2(secs)}`;
  },
  renderMission() {
    const met = this.formatMET(new Date());
    const el = document.getElementById('tt-met');
    if (el) el.textContent = met;
  },
  weatherArt(code) {
    if (code <= 2)  return ['     \\  |  /    ', '      --O--      ', '     /  |  \\    '];
    if (code === 3) return ['  ~~~~~~~~~~~~~~', '   ~~~~~~~~~~~~~', '  ~~~~~~~~~~~~~~'];
    if (code >= 51 && code <= 67) return ['  |  |  |  |  | ', '  |  |  |  |  | ', '  |  |  |  |  | '];
    if (code >= 71 && code <= 77) return ['  *  *  *  *  * ', '  *  *  *  *  * ', '  *  *  *  *  * '];
    if (code >= 95 && code <= 99) return ['  !!! THUNDER !!!', '  ~~~~~~~~~~~~~~~', '  !! LIGHTNING !!'];
    return ['  ?  ?  ?  ?  ? ', '  ?  ?  ?  ?  ? ', '  ?  ?  ?  ?  ? '];
  },
  render(data) {
    const R = App.Renderer;
    const pad = s => String(s).padEnd(40, ' ');
    const c = data.current || data.current_weather || {};
    const temp = c.temperature_2m !== undefined ? c.temperature_2m : (c.temperature || '--');
    const wind = c.wind_speed_10m !== undefined ? c.wind_speed_10m : (c.windspeed || '--');
    const code = c.weathercode !== undefined ? c.weathercode : (c.weather_code || 0);
    const art = this.weatherArt(code);
    let html = R.row(pad('P500  RETRO ASCII WEATHER + TELEMETRY'), 'tt-cyan tt-bold');
    html += R.row(pad('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'), 'tt-white');
    html += R.row(pad('  SURFACE WEATHER REPORT'), 'tt-yellow');
    art.forEach(line => { html += R.row(pad(line), 'tt-white'); });
    html += R.row(pad(`  TEMPERATURE : ${temp}\u00b0C`), 'tt-green');
    html += R.row(pad(`  WIND SPEED  : ${wind} km/h`), 'tt-green');
    html += R.row(pad('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'), 'tt-white');
    html += R.row(pad('  ORBITAL TELEMETRY'), 'tt-yellow');
    html += R.row('  MISSION ELAPSED TIME:', 'tt-white');
    html += `<div class="tt-row tt-cyan">  T+ <span id="tt-met">${this.formatMET(new Date())}</span></div>`;
    html += R.row(pad('  SIGNAL  [##########] 100%'), 'tt-green');
    html += R.row(pad('  ORBIT   [LEO 408KM]'), 'tt-white');
    html += R.row(pad('  STATUS  [ALL SYSTEMS NOMINAL]'), 'tt-green');
    R.renderPage(500, html);
  },
  renderFallback() {
    const R = App.Renderer;
    const pad = s => s.padEnd(40, ' ');
    let html = R.row(pad('P500  TELEMETRY SIGNAL LOST'), 'tt-red tt-bold');
    html += R.row(pad('  NO WEATHER DATA AVAILABLE'), 'tt-red');
    html += R.row(pad('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'), 'tt-white');
    html += R.row(pad('  ORBITAL TELEMETRY'), 'tt-yellow');
    html += `<div class="tt-row tt-cyan">  T+ <span id="tt-met">${this.formatMET(new Date())}</span></div>`;
    html += R.row(pad('  SIGNAL  [----------]  0%'), 'tt-red');
    R.renderFallback(500, html);
  },
  async fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,wind_speed_10m,weathercode`;
    try {
      const data = await safeFetch(url);
      this.render(data);
    } catch(e) {
      this.renderFallback();
    }
  },
  init() {
    this.renderMission();
    this.missionTimerId = setInterval(() => this.renderMission(), 1000);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => this.fetchWeather(pos.coords.latitude, pos.coords.longitude),
        ()  => this.fetchWeather(51.5, -0.1)
      );
    } else {
      this.fetchWeather(51.5, -0.1);
    }
  },
  teardown() {
    clearInterval(this.missionTimerId);
    this.missionTimerId = null;
  }
};

// ─── DOMContentLoaded — Wire Everything Together ──────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Global error suppression
  window.onerror = () => true;
  window.addEventListener('unhandledrejection', e => e.preventDefault());

  // Register page subsystems
  App.Router.subsystems = {
    100: { init: initP100,              teardown: () => {} },
    200: App.CryptoTicker,
    300: App.NewsSynth,
    400: App.AIOracle,
    500: App.Telemetry
  };

  // Boot
  App.Sound.init();
  App.Clock.start();

  // Sound toggle button
  document.getElementById('tt-sound-toggle').addEventListener('click', () => App.Sound.toggle());

  // On-screen remote digits
  document.querySelectorAll('.remote-digit').forEach(btn => {
    btn.addEventListener('click', () => App.Navigator.handleDigit(Number(btn.dataset.digit)));
  });
  document.getElementById('tt-remote-back').addEventListener('click', () => App.Navigator.handleBack());

  // Fastext buttons
  const fastextMap = { red: 100, green: 200, yellow: 300, blue: 400 };
  document.querySelectorAll('.fastext-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = fastextMap[btn.dataset.color];
      if (page) App.Router.navigateTo(page);
    });
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.target && e.target.id === 'tt-oracle-input') return; // don't intercept oracle input
    const digitMatch = e.code.match(/^(?:Digit|Numpad)(\d)$/);
    if (digitMatch) { App.Navigator.handleDigit(Number(digitMatch[1])); return; }
    if (e.code === 'Backspace' || e.code === 'Escape') { App.Navigator.handleBack(); return; }
    if (e.code === 'F1') { App.Router.navigateTo(100); return; }
    if (e.code === 'F2') { App.Router.navigateTo(200); return; }
    if (e.code === 'F3') { App.Router.navigateTo(300); return; }
    if (e.code === 'F4') { App.Router.navigateTo(400); return; }
    if (e.code === 'F5') { App.Router.navigateTo(500); return; }
  });

  // Navigate to P100 to start
  App.Router.navigateTo(100);
});
