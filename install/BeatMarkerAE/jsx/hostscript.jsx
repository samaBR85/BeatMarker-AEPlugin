// ExtendScript — roda dentro do After Effects
// Chamado via CSInterface.evalScript() a partir do main.js

// ── JSON polyfill (ExtendScript ES3 pode não ter JSON nativo) ────────────────
if (typeof JSON === 'undefined') { JSON = {}; }
if (typeof JSON.parse === 'undefined') {
  JSON.parse = function(s) { return eval('(' + s + ')'); };
}
if (typeof JSON.stringify === 'undefined') {
  JSON.stringify = function(v) {
    if (v === null)           return 'null';
    if (v === undefined)      return undefined;
    var t = typeof v;
    if (t === 'number')       return isFinite(v) ? String(v) : 'null';
    if (t === 'boolean')      return String(v);
    if (t === 'string')       return '"' + v.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\n/g,'\\n').replace(/\r/g,'\\r').replace(/\t/g,'\\t') + '"';
    if (t === 'object') {
      if (v instanceof Array) {
        var a = [];
        for (var i = 0; i < v.length; i++) a.push(JSON.stringify(v[i]));
        return '[' + a.join(',') + ']';
      }
      var s = [];
      for (var k in v) {
        if (v.hasOwnProperty(k) && v[k] !== undefined)
          s.push('"' + k + '":' + JSON.stringify(v[k]));
      }
      return '{' + s.join(',') + '}';
    }
    return undefined;
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function getActiveComp() {
  var proj = app.project;
  if (!proj) return null;
  var item = proj.activeItem;
  if (!item || !(item instanceof CompItem)) return null;
  return item;
}

function getSelectedAudioLayer(comp) {
  for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer.selected && layer.hasAudio) return layer;
  }
  for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer.hasAudio) return layer;
  }
  return null;
}

// ── API pública (cada função retorna JSON string) ─────────────────────────────

function bmGetAudioLayerInfo() {
  try {
    var comp = getActiveComp();
    if (!comp) return JSON.stringify({ error: 'Nenhuma composição ativa.' });

    var layer = getSelectedAudioLayer(comp);
    if (!layer) return JSON.stringify({ error: 'Nenhuma layer de áudio encontrada na composição.' });

    var source = layer.source;
    if (!source || !source.file) return JSON.stringify({ error: 'Layer não tem footage de arquivo.' });

    return JSON.stringify({
      layerName:  layer.name,
      layerIndex: layer.index,
      filePath:   source.file.fsName,
      fileName:   source.file.name,
      duration:   source.duration,
      compName:   comp.name
    });
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

// ── Helpers de markers ────────────────────────────────────────────────────────
// target: 'layer' → markers na layer de áudio (clip)
//         'comp'  → markers na composição (timeline, faixa separada)
//
// Rastreamento interno via setParameters({ b: '<beatPos>' })
// Nenhum campo de texto visível é preenchido — o escudo fica limpo.

function getMarkersProperty(comp, target) {
  if (target === 'comp') return comp.markerProperty;
  var layer = getSelectedAudioLayer(comp);
  return layer ? layer.property('Marker') : null;
}

// Cria um MarkerValue limpo (sem texto visível) com beatPos guardado em setParameters
function makeBeatMarker(beatPos, label) {
  var mv = new MarkerValue(''); // comment vazio
  mv.duration = 0;
  mv.label    = label;
  // setParameters armazena key-value invisível — não aparece no escudo do timeline
  var p = {};
  p.b = String(beatPos); // 'b' = beat position 1..4
  mv.setParameters(p);
  return mv;
}

// Lê beatPos de um MarkerValue (retorna 0 se não for um marker BeatMarker)
function getBeatPos(mv) {
  try {
    var p = mv.getParameters();
    if (p && p.b) return parseInt(p.b);
  } catch (e) {}
  // Fallback: legado com frameTarget
  if (mv.frameTarget) {
    var m = mv.frameTarget.match(/^BM:(\d)$/);
    if (m) return parseInt(m[1]);
  }
  return 0;
}

// Cores: Beat1=Red(1), Beat2=Blue(8), Beat3=Yellow(2), Beat4=Aqua(3)
// Labels únicos por beat — necessário para bmAdjustPhase funcionar corretamente.
var BM_LABEL = { 1: 1, 2: 8, 3: 2, 4: 3 };

function bmCreateMarkers(jsonStr) {
  try {
    var data        = JSON.parse(jsonStr);
    var beats       = data.beats;
    var offset      = data.offset      || 0;
    var activeBeats = data.activeBeats || [true, true, true, true];
    var target      = data.target      || 'layer';

    var comp = getActiveComp();
    if (!comp) return JSON.stringify({ error: 'Nenhuma composição ativa.' });

    var markers = getMarkersProperty(comp, target);
    if (!markers) return JSON.stringify({ error: 'Nenhuma layer de áudio encontrada.' });

    // Desloca os tempos pelo início da layer na timeline (válido para layer e comp markers,
    // pois setValueAtTime usa sempre tempo da composição, não tempo local da layer)
    var audioLayer = getSelectedAudioLayer(comp);
    var timeOffset = audioLayer ? audioLayer.startTime : 0;

    app.beginUndoGroup('BeatMarker AE: Criar Markers');

    var created = 0;
    for (var i = 0; i < beats.length; i++) {
      var beatPos = ((i + offset) % 4) + 1; // 1..4
      if (!activeBeats[beatPos - 1]) continue;
      markers.setValueAtTime(beats[i] + timeOffset, makeBeatMarker(beatPos, BM_LABEL[beatPos]));
      created++;
    }

    app.endUndoGroup();
    return JSON.stringify({ created: created });
  } catch (e) {
    try { app.endUndoGroup(); } catch(e2) {}
    return JSON.stringify({ error: String(e) });
  }
}

// Ajusta fase com diff mínimo: markers que continuam ativos são só relabelados
// (setValueAtKey = sem redraw). Apenas markers que mudam ativo↔inativo são add/remove.
// Input: { delta, activeBeats[4], timesToAdd[{t, beatPos}], target }
function bmAdjustPhase(jsonStr) {
  try {
    var data        = JSON.parse(jsonStr);
    var delta       = data.delta       || 0;
    var activeBeats = data.activeBeats || [true, true, true, true];
    var timesToAdd  = data.timesToAdd  || [];
    var target      = data.target      || 'layer';

    var comp = getActiveComp();
    if (!comp) return JSON.stringify({ error: 'Nenhuma composição ativa.' });

    var markers = getMarkersProperty(comp, target);
    if (!markers) return JSON.stringify({ error: 'Nenhuma layer de áudio encontrada.' });

    var audioLayer2 = getSelectedAudioLayer(comp);
    var timeOffset  = audioLayer2 ? audioLayer2.startTime : 0;

    app.beginUndoGroup('BeatMarker AE: Ajustar Fase');

    // Passo 1: atualizar/remover existentes (de trás pra frente)
    // Os markers já existentes estão nos tempos corretos da comp — só atualiza label
    var count = markers.numKeys;
    for (var i = count; i >= 1; i--) {
      var mv      = markers.keyValue(i);
      var curBeat = getBeatPos(mv);
      if (!curBeat) continue;

      var newBeat = ((curBeat - 1 + delta + 4) % 4) + 1;

      if (activeBeats[newBeat - 1]) {
        markers.setValueAtKey(i, makeBeatMarker(newBeat, BM_LABEL[newBeat]));
      } else {
        markers.removeKey(i);
      }
    }

    // Passo 2: adicionar markers que ficaram ativos (timesToAdd tem tempos relativos ao arquivo)
    for (var j = 0; j < timesToAdd.length; j++) {
      var item = timesToAdd[j];
      markers.setValueAtTime(item.t + timeOffset, makeBeatMarker(item.beatPos, BM_LABEL[item.beatPos]));
    }

    app.endUndoGroup();
    return JSON.stringify({ ok: true });
  } catch (e) {
    try { app.endUndoGroup(); } catch(e2) {}
    return JSON.stringify({ error: String(e) });
  }
}

// Fallback sem beats em memória
function bmRecolorMarkers(jsonStr) {
  try {
    var data   = JSON.parse(jsonStr);
    var delta  = data.delta  || 0;
    var target = data.target || 'layer';

    var comp = getActiveComp();
    if (!comp) return JSON.stringify({ error: 'Nenhuma composição ativa.' });

    var markers   = getMarkersProperty(comp, target);
    if (!markers) return JSON.stringify({ error: 'Nenhuma layer de áudio encontrada.' });
    var count     = markers.numKeys;
    var recolored = 0;

    app.beginUndoGroup('BeatMarker AE: Ajustar Fase');

    for (var i = 1; i <= count; i++) {
      var mv      = markers.keyValue(i);
      var curBeat = getBeatPos(mv);
      if (!curBeat) continue;
      var newBeat = ((curBeat - 1 + delta + 4) % 4) + 1;
      markers.setValueAtKey(i, makeBeatMarker(newBeat, BM_LABEL[newBeat]));
      recolored++;
    }

    app.endUndoGroup();
    return JSON.stringify({ recolored: recolored });
  } catch (e) {
    try { app.endUndoGroup(); } catch(e2) {}
    return JSON.stringify({ error: String(e) });
  }
}

function bmClearMarkers(jsonStr) {
  try {
    var data   = jsonStr ? JSON.parse(jsonStr) : {};
    var target = data.target || 'layer';

    var comp = getActiveComp();
    if (!comp) return JSON.stringify({ error: 'Nenhuma composição ativa.' });

    var markers = getMarkersProperty(comp, target);
    if (!markers) return JSON.stringify({ error: 'Nenhuma layer de áudio encontrada.' });
    var removed = 0;

    app.beginUndoGroup('BeatMarker AE: Remover Markers');

    for (var i = markers.numKeys; i >= 1; i--) {
      var mv = markers.keyValue(i);
      // Detecta markers BeatMarker: novo formato (setParameters) ou legado (frameTarget/comment)
      var isBM = false;
      try { var p = mv.getParameters(); isBM = !!(p && p.b); } catch(e) {}
      if (!isBM && mv.frameTarget) isBM = mv.frameTarget.indexOf('BM:') === 0;
      if (!isBM) isBM = mv.comment.indexOf('[BM:') === 0 || mv.comment.indexOf('[BM]') === 0;
      if (isBM) { markers.removeKey(i); removed++; }
    }

    app.endUndoGroup();
    return JSON.stringify({ removed: removed });
  } catch (e) {
    try { app.endUndoGroup(); } catch(e2) {}
    return JSON.stringify({ error: String(e) });
  }
}
