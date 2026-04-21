/* global CSInterface, analyzeAudio */
'use strict';

const cs = new CSInterface();

// ── Estado ────────────────────────────────────────────────────────────────────
let state = {
  beats:        null,
  bpm:          null,
  filePath:     null,
  hasMarkers:   false,
  beatOffset:   0,                        // offset visual dos beat buttons (0..3)
  activeBeats:  [true, true, true, true], // beats 1-4 ativos
  markerTarget: 'layer'                   // alvo do phase: 'layer' | 'comp'
};

// ── i18n ─────────────────────────────────────────────────────────────────────
const isPT = navigator.language.startsWith('pt');
const S = {
  // Card hint
  clipHint:         isPT ? 'Selecione uma layer de áudio na composição'  : 'Select an audio layer in the active composition',
  clipHintSub:      isPT ? 'então clique em ANALISAR LAYER SELECIONADA'  : 'then click ANALYZE SELECTED LAYER',
  // Beats row
  beatsHint:        isPT ? '◆ Toque nos beats para ativar/desativar'     : '◆ Tap beats to toggle on/off',
  // Buttons
  btnAnalyze:       isPT ? 'Analisar Layer Selecionada'                  : 'Analyze Selected Layer',
  btnCreateClip:    isPT ? 'Criar no Clip'                               : 'Create on Clip',
  btnCreateComp:    isPT ? 'Criar na Timeline'                           : 'Create on Timeline',
  btnRemoveClip:    isPT ? 'Remover do Clip'                             : 'Remove from Clip',
  btnRemoveComp:    isPT ? 'Remover da Timeline'                         : 'Remove from Timeline',
  // Phase toggle
  phaseLabelClip:   isPT ? 'fase no clip'                                : 'phase clip',
  phaseLabelComp:   isPT ? 'fase na timeline'                            : 'phase timeline',
  // Log
  showLog:          isPT ? 'mostrar log ▼'                               : 'show log ▼',
  hideLog:          isPT ? 'ocultar log ▲'                               : 'hide log ▲',
  copyLog:          isPT ? '📋 copiar'                                   : '📋 copy',
  copied:           isPT ? '✓ copiado'                                   : '✓ copied',
  // Footer
  footer:           isPT ? 'Adobe After Effects · Plugin CEP'            : 'Adobe After Effects · CEP Plugin',
  // Status
  analyzing:        isPT ? 'Analisando...'                               : 'Analyzing...',
  analysisOk:       isPT ? 'Análise concluída ✓'                         : 'Analysis complete ✓',
  readError:        isPT ? 'Erro ao ler arquivo.'                        : 'Error reading file.',
  noAnalysis:       isPT ? 'Analise o áudio primeiro.'                   : 'Analyze audio first.',
  createdFmt:       isPT ? (n) => `${n} markers criados ✓`               : (n) => `${n} markers created ✓`,
  removedFmt:       isPT ? (n) => `${n} markers removidos.`              : (n) => `${n} markers removed.`,
  phaseAdj:         isPT ? 'Fase ajustada ✓'                             : 'Phase adjusted ✓',
  ready:            isPT ? 'Pronto'                                       : 'Ready',
  clearError:       isPT ? 'Erro ao limpar markers.'                     : 'Error clearing markers.',
  unknownError:     isPT ? 'Erro desconhecido'                           : 'Unknown error',
};

// ── Confidence phrases ────────────────────────────────────────────────────────
const CONFIDENCE = {
  high: {
    color: '#4c4', cls: 'ready',
    statusPT: 'Pronto — crie seus markers abaixo',
    statusEN: 'Ready — create your markers below',
    phrases: [
      { quote: 'Not rushing, not dragging.',       subtitlePT: 'Consistência de tempo perfeita',              subtitleEN: 'Perfect tempo consistency' },
      { quote: 'In the pocket.',                   subtitlePT: 'Markers vão cair exatamente no beat',          subtitleEN: 'Markers will land exactly on beat' },
      { quote: 'Fletcher would approve.',          subtitlePT: 'Confiança de análise muito alta',              subtitleEN: 'Analysis confidence is very high' },
      { quote: "That's the one.",                  subtitlePT: 'BPM detectado com precisão',                   subtitleEN: 'BPM detected with precision' },
      { quote: 'Like a metronome.',                subtitlePT: 'Variação de tempo praticamente zero',           subtitleEN: 'Virtually zero tempo variation' },
      { quote: 'Studio take.',                     subtitlePT: 'Tempo limpo e consistente detectado',           subtitleEN: 'Clean, consistent tempo detected' },
      { quote: 'One take wonder.',                 subtitlePT: 'Beat grid sólido como rocha',                  subtitleEN: 'Beat grid is rock solid' },
      { quote: "This is what we came for.",        subtitlePT: 'Excelente consistência de beats',               subtitleEN: 'Excellent beat consistency' },
      { quote: "Now we're cooking.",               subtitlePT: 'Markers confiáveis a caminho',                  subtitleEN: 'Reliable markers ahead' },
      { quote: 'Tight.',                           subtitlePT: 'Alta confiança — markers prontos',              subtitleEN: 'High confidence — markers ready' },
    ]
  },
  medium: {
    color: '#ca4', cls: 'warning',
    statusPT: 'Verifique a fase antes de criar',
    statusEN: 'Check phase before creating',
    phrases: [
      { quote: 'Were you rushing or were you dragging?', subtitlePT: 'Alguma variação de tempo detectada',           subtitleEN: 'Some tempo variation detected' },
      { quote: 'Close enough for jazz?',                 subtitlePT: 'Consistência moderada — verifique os markers',  subtitleEN: 'Moderate consistency — check the markers' },
      { quote: 'A little loosey-goosey.',                subtitlePT: 'Intervalos de beat levemente irregulares',      subtitleEN: 'Beat intervals are slightly uneven' },
      { quote: 'Almost there. Almost.',                  subtitlePT: 'Boa confiança, pequenas inconsistências',        subtitleEN: 'Good confidence, minor inconsistencies' },
      { quote: "The feel is there, the grid isn't.",     subtitlePT: 'Tempo varia levemente',                         subtitleEN: 'Tempo varies slightly' },
      { quote: 'Human, but maybe too human.',            subtitlePT: 'Feel de performance ao vivo detectado',          subtitleEN: 'Live performance feel detected' },
      { quote: 'I can work with this.',                  subtitlePT: 'Utilizável, mas verifique pontos-chave',         subtitleEN: 'Usable, but verify key points' },
      { quote: 'Somewhere between a click and a vibe.',  subtitlePT: 'Consistência de tempo mista',                    subtitleEN: 'Mixed tempo consistency' },
      { quote: 'Not bad. Not great.',                    subtitlePT: 'Média confiança — revise os markers',            subtitleEN: 'Medium confidence — review markers' },
      { quote: "It's giving... approximately.",          subtitlePT: 'BPM aproximado — possível drift',                subtitleEN: 'Approximate BPM — some drift possible' },
    ]
  },
  low: {
    color: '#c44', cls: 'error',
    statusPT: 'Resultado pode estar errado',
    statusEN: 'Result may be inaccurate',
    phrases: [
      { quote: 'Not quite my tempo.',                              subtitlePT: 'Alta variação — markers podem ser imprecisos',    subtitleEN: 'High tempo variation — markers may be unreliable' },
      { quote: "This is not a tempo, it's a suggestion.",          subtitlePT: 'Algoritmo lutou para achar um beat estável',       subtitleEN: 'Algorithm struggled to find a steady beat' },
      { quote: 'Rubato nightmare.',                                subtitlePT: 'Tempo livre — markers vão driftar',                subtitleEN: 'Free tempo — markers will drift' },
      { quote: "Charlie Parker would've done something with this.", subtitlePT: 'Irregular demais para detecção confiável',        subtitleEN: 'Too irregular for reliable detection' },
      { quote: 'Were you even playing to a click?',                subtitlePT: 'Nenhum tempo consistente encontrado',              subtitleEN: 'No consistent tempo found' },
      { quote: 'Bold choice.',                                     subtitlePT: 'Variação de tempo muito alta detectada',           subtitleEN: 'Very high tempo variation detected' },
      { quote: "This one's on you.",                               subtitlePT: 'Baixa confiança — use os markers por sua conta',   subtitleEN: 'Low confidence — use markers at your own risk' },
      { quote: 'The grid has left the building.',                  subtitlePT: 'Consistência de beat baixa demais',                subtitleEN: 'Beat consistency too low for reliable markers' },
      { quote: "Even Fletcher couldn't save this.",                subtitlePT: 'Análise falhou em achar um tempo estável',         subtitleEN: 'Analysis failed to find a steady tempo' },
      { quote: 'Somewhere, a drummer is being yelled at.',         subtitlePT: 'Inconsistência de tempo extrema detectada',        subtitleEN: 'Extreme tempo inconsistency detected' },
    ]
  }
};

// ── Elementos ─────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const elClipName   = $('clip-name');
const elClipSub    = $('clip-sub');
const elBpmVal     = $('bpm-val');
const elConfWrap   = $('confidence-wrap');
const elConfBar    = $('confidence-bar');
const elConfQuote  = $('conf-quote');
const elConfDesc   = $('conf-desc');
const elConfStatus = $('conf-status');
const elStatusDot    = $('status-dot');
const elStatusMsg    = $('status-msg');
const elBtnAnalyze  = $('btn-analyze');
const elBtnApplyClip = $('btn-apply-clip');
const elBtnApplyComp = $('btn-apply-comp');
const elBtnClearClip = $('btn-clear-clip');
const elBtnClearComp = $('btn-clear-comp');
const elBtnPrev          = $('btn-prev');
const elBtnNext          = $('btn-next');
const elPhaseToggle      = $('phase-target-toggle');
const elPhaseLabelClip   = $('phase-label-clip');
const elPhaseLabelComp   = $('phase-label-comp');
const elLog              = $('log');

// ── Phase target toggle ───────────────────────────────────────────────────────
function getPhaseTarget() {
  return elPhaseToggle.checked ? 'comp' : 'layer';
}

function updatePhaseLabels() {
  const isComp = elPhaseToggle.checked;
  elPhaseLabelClip.classList.toggle('active', !isComp);
  elPhaseLabelComp.classList.toggle('active',  isComp);
}

elPhaseToggle.addEventListener('change', updatePhaseLabels);
updatePhaseLabels();

// ── Aplicar strings i18n ──────────────────────────────────────────────────────
elClipName.textContent               = S.clipHint;
elClipSub.textContent                = S.clipHintSub;
elBtnAnalyze.textContent             = S.btnAnalyze;
elBtnApplyClip.textContent           = S.btnCreateClip;
elBtnApplyComp.textContent           = S.btnCreateComp;
elBtnClearClip.textContent           = S.btnRemoveClip;
elBtnClearComp.textContent           = S.btnRemoveComp;
elPhaseLabelClip.textContent         = S.phaseLabelClip;
elPhaseLabelComp.textContent         = S.phaseLabelComp;
$('beats-hint').textContent          = S.beatsHint;
$('log-toggle-btn').textContent      = S.showLog;
$('btn-copy-log').textContent        = S.copyLog;
$('footer-text').textContent         = S.footer;

// ── Beat colors (offset relativo ao display) ──────────────────────────────────
const BEAT_CLASSES = ['beat-1', 'beat-2', 'beat-3', 'beat-4'];

function updateBeatButtons() {
  for (let i = 1; i <= 4; i++) {
    const btn    = $('beat-' + i);
    const active = state.activeBeats[i - 1];
    btn.className = 'beat-btn beat-' + i + (active ? '' : ' off');
  }
}

function getFilteredBeats() {
  if (!state.beats) return [];
  return state.beats.filter((_, globalIdx) => {
    const beatPos = (globalIdx + state.beatOffset) % 4; // 0..3
    return state.activeBeats[beatPos];
  });
}

async function recreateMarkers(target) {
  const clearRaw = await evalScript('bmClearMarkers', { target });
  const clearRes = parseResult(clearRaw);
  if (clearRes.error) { log(S.clearError + ' ' + clearRes.error); return; }
  const raw    = await evalScript('bmCreateMarkers', { beats: state.beats, offset: state.beatOffset, activeBeats: state.activeBeats, target });
  const result = parseResult(raw);
  if (result.error) log('Erro ao recriar: ' + result.error);
  else { log(`Markers recriados: ${result.created}`); setStatus(S.createdFmt(result.created), '#4c4'); }
}

for (let i = 1; i <= 4; i++) {
  $('beat-' + i).addEventListener('click', () => {
    state.activeBeats[i - 1] = !state.activeBeats[i - 1];
    updateBeatButtons();
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(msg) {
  const line = document.createElement('div');
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  elLog.appendChild(line);
  elLog.scrollTop = elLog.scrollHeight;
}

function setDot(mode) { // 'idle' | 'busy' | 'ready'
  elStatusDot.className = 'status-dot' + (mode !== 'idle' ? ' ' + mode : '');
}

function setStatus(msg, color) {
  elStatusMsg.textContent = msg;
  elStatusMsg.style.color = color || '#4c4';
}

function evalScript(fn, arg) {
  return new Promise((resolve) => {
    const call = arg !== undefined
      ? `${fn}(${JSON.stringify(JSON.stringify(arg))})`
      : `${fn}()`;
    cs.evalScript(call, (result) => resolve(result));
  });
}

function parseResult(raw) {
  try { return JSON.parse(raw); } catch { return { error: raw }; }
}

function setUIState(phase) {
  const enabled = phase === 'ready' || phase === 'marked';
  elBtnApplyClip.disabled = !enabled;
  elBtnApplyComp.disabled = !enabled;
}

function computeConfidence(beats) {
  if (!beats || beats.length < 2) return 0;
  const intervals = [];
  for (let i = 1; i < beats.length; i++) intervals.push(beats[i] - beats[i - 1]);
  const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const variance = intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length;
  const cv = Math.sqrt(variance) / mean; // coefficient of variation
  return Math.max(0, Math.min(100, Math.round((1 - cv * 4) * 100)));
}

function showConfidence(beats) {
  const pct   = computeConfidence(beats);
  const level = pct > 85 ? 'high' : pct >= 60 ? 'medium' : 'low';
  const cfg   = CONFIDENCE[level];
  const pick  = cfg.phrases[Math.floor(Math.random() * cfg.phrases.length)];

  elConfBar.style.width    = pct + '%';
  elConfBar.style.background = cfg.color;
  elConfBar.className      = 'conf-bar';
  elConfQuote.textContent  = `"${pick.quote}"`;
  elConfDesc.textContent   = isPT ? pick.subtitlePT : pick.subtitleEN;
  elConfStatus.textContent = isPT ? cfg.statusPT : cfg.statusEN;
  elConfStatus.style.color = cfg.color;
  elConfStatus.className   = '';
  elConfWrap.style.display = 'block';

  log(`Confidence: ${pct}% (${level})`);
}

function readFileAsArrayBuffer(filePath) {
  return new Promise((resolve, reject) => {
    const result = window.cep.fs.readFile(filePath, cep.encoding.Base64);
    if (result.err !== 0) { reject(new Error(`cep.fs.readFile error ${result.err}`)); return; }
    const bin  = atob(result.data.replace(/\s+/g, ''));
    const buf  = new ArrayBuffer(bin.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i);
    resolve(buf);
  });
}

// ── Ações ─────────────────────────────────────────────────────────────────────
// Estado inicial
setStatus(S.ready, '#5b9cf6');

elBtnAnalyze.addEventListener('click', async () => {
  elBtnAnalyze.disabled = true;
  elClipName.textContent = S.analyzing;
  elClipName.className   = 'hint';
  elClipSub.textContent  = '';
  elBpmVal.textContent   = '--';
  elConfWrap.style.display = 'none';
  setDot('busy');
  setStatus('');
  setUIState('analyzing');

  try {
    const raw  = await evalScript('bmGetAudioLayerInfo');
    log(`RAW: ${raw}`);
    const info = parseResult(raw);

    if (!info || info.error) {
      elClipName.textContent = (info && info.error) || S.unknownError;
      log('Erro: ' + JSON.stringify(info));
      setDot('idle'); setUIState('idle');
      elBtnAnalyze.disabled = false;
      return;
    }

    elClipName.textContent = info.layerName;
    elClipName.className   = '';
    state.filePath = info.filePath;
    log(`Layer: ${info.layerName}`);

    const buf = await readFileAsArrayBuffer(info.filePath);
    log(`Lido: ${(buf.byteLength / 1024 / 1024).toFixed(1)} MB`);

    const result = await analyzeAudio(buf);
    state.beats  = result.beats;
    state.bpm    = result.bpm;
    state.beatOffset = 0;
    updateBeatButtons(); // reset visual

    const ext  = info.filePath.split('.').pop().toUpperCase();
    const mb   = (buf.byteLength / 1024 / 1024).toFixed(1);
    elBpmVal.textContent  = parseFloat(result.bpm).toFixed(1);
    elClipSub.textContent = `${ext} · ${mb} MB · ${result.beats.length} beats`;
    showConfidence(result.beats);
    setStatus(S.analysisOk, '#4c4');
    log(`BPM: ${result.bpm} | Beats: ${result.beats.length}`);
    setDot('ready');
    setUIState('ready');
  } catch (e) {
    elClipName.textContent = S.readError;
    log('Exceção: ' + e);
    setDot('idle'); setUIState('idle');
  }

  elBtnAnalyze.disabled = false;
});

async function handleCreate(target) {
  if (!state.beats) { log(S.noAnalysis); return; }
  const btn = target === 'comp' ? elBtnApplyComp : elBtnApplyClip;
  btn.disabled = true;
  setStatus('');

  const clearRaw = await evalScript('bmClearMarkers', { target });
  const clearRes = parseResult(clearRaw);
  if (clearRes.error) { log('Erro ao limpar: ' + clearRes.error); btn.disabled = false; return; }

  const raw    = await evalScript('bmCreateMarkers', { beats: state.beats, offset: state.beatOffset, activeBeats: state.activeBeats, target });
  const result = parseResult(raw);

  if (result.error) {
    log('Erro: ' + result.error);
    setStatus(result.error, '#c44');
  } else {
    log(S.createdFmt(result.created));
    setStatus(S.createdFmt(result.created), '#4c4');
    state.hasMarkers = true;
    setUIState('marked');
  }
  btn.disabled = false;
}

elBtnApplyClip.addEventListener('click', () => handleCreate('layer'));
elBtnApplyComp.addEventListener('click', () => handleCreate('comp'));

async function handleClear(target) {
  const btn = target === 'comp' ? elBtnClearComp : elBtnClearClip;
  btn.disabled = true;
  const raw    = await evalScript('bmClearMarkers', { target });
  const result = parseResult(raw);

  if (result.error) {
    log('Erro: ' + result.error);
    setStatus(result.error, '#c44');
  } else {
    log(S.removedFmt(result.removed));
    setStatus(S.removedFmt(result.removed), '#888');
  }
  btn.disabled = false;
}

elBtnClearClip.addEventListener('click', () => handleClear('layer'));
elBtnClearComp.addEventListener('click', () => handleClear('comp'));

elBtnPrev.addEventListener('click', () => applyPhase(+1));
elBtnNext.addEventListener('click', () => applyPhase(-1));

async function applyPhase(delta) {
  const target     = getPhaseTarget();
  const oldOffset  = state.beatOffset;
  state.beatOffset = (state.beatOffset + delta + 4) % 4;

  if (state.beats) {
    const timesToAdd = [];
    for (let i = 0; i < state.beats.length; i++) {
      const oldPos = (i + oldOffset)        % 4;
      const newPos = (i + state.beatOffset) % 4;
      if (!state.activeBeats[oldPos] && state.activeBeats[newPos])
        timesToAdd.push({ t: state.beats[i], beatPos: newPos + 1 });
    }
    const raw    = await evalScript('bmAdjustPhase', { delta, activeBeats: state.activeBeats, timesToAdd, target });
    const result = parseResult(raw);
    if (result.error) { log('Erro fase: ' + result.error); setStatus(result.error, '#c44'); return; }
    log(`${S.phaseAdj} (${delta > 0 ? '+' : ''}${delta}) +${timesToAdd.length} added`);
    setStatus(S.phaseAdj, '#4c4');
    return;
  }

  // Fallback sem beats em memória
  const raw    = await evalScript('bmRecolorMarkers', { delta, target });
  const result = parseResult(raw);
  if (result.error) { log('Erro fase: ' + result.error); setStatus(result.error, '#c44'); return; }
  log(`${S.phaseAdj} (${delta > 0 ? '+' : ''}${delta}) recolored=${result.recolored}`);
  setStatus(S.phaseAdj, '#4c4');
}
