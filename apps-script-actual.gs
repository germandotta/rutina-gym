// Este archivo vive en Google Apps Script (Extensiones > Apps Script del
// Google Sheet), NO en el repo de GitHub. Se incluye acá solo como
// referencia para que Claude Code sepa qué backend está corriendo hoy.
//
// Para modificarlo hay que ir directo a script.google.com y hacer
// "Implementar > Administrar implementaciones > Nueva versión" después de
// editar. La URL del endpoint (SHEETS_URL en el HTML) no cambia mientras se
// reutilice el mismo deployment.
//
// Hoja de registros, columnas (headers en fila 1, tal cual, con mayúscula/tilde):
// Fecha | Hora | Día | Ejercicio | Carga | Reps | Completado
//
// El plan (inicio, semanas, sesiones por semana) vive en la pestaña "Plan", que se
// crea sola; se edita a mano en B2:B4. La app lo envía/recibe con el día "__plan__",
// que el script desvía a esa pestaña sin escribirlo en la hoja de registros.
//
// Las series y reps de cada ejercicio (las que cambia el fisio desde "Configurar" en la
// app) viven en la pestaña "Ejercicios", una fila por ejercicio: Id | Ejercicio | Sesión |
// Series | Reps. Se pueden editar a mano en Series y Reps (no cambiar el Id). La app las
// envía con el día "__ejercicios__". doGet devuelve además "version": 2; la app solo
// manda configuración de ejercicios si ve esa versión.

const VERSION = 2;
const HOJA_PLAN = 'Plan';
const HOJA_EJERCICIOS = 'Ejercicios';
const HOJAS_AUXILIARES = [HOJA_PLAN, HOJA_EJERCICIOS];
const DIA_PLAN = '__plan__';
const DIA_EJERCICIOS = '__ejercicios__';

// Hoja de registros: la activa de siempre, salvo que una pestaña auxiliar ("Plan" o
// "Ejercicios") haya quedado activa (por ejemplo al crearse sola); en ese caso, la
// primera hoja que no sea auxiliar.
function hojaRegistros() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activa = ss.getActiveSheet();
  if (!HOJAS_AUXILIARES.includes(activa.getName())) return activa;
  return ss.getSheets().find(h => !HOJAS_AUXILIARES.includes(h.getName()));
}

function hojaPlan() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let h = ss.getSheetByName(HOJA_PLAN);
  if (!h) {
    const previa = ss.getActiveSheet();
    h = ss.insertSheet(HOJA_PLAN);
    h.getRange('A1:B4').setValues([['Plan', 'Valor'], ['Fecha de inicio (AAAA-MM-DD)', ''], ['Semanas', ''], ['Sesiones por semana', '']]);
    h.getRange('B2').setNumberFormat('@'); // texto, para que no lo convierta en fecha
    ss.setActiveSheet(previa);
  }
  return h;
}

function hojaEjercicios() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let h = ss.getSheetByName(HOJA_EJERCICIOS);
  if (!h) {
    const previa = ss.getActiveSheet();
    h = ss.insertSheet(HOJA_EJERCICIOS);
    h.getRange('A1:E1').setValues([['Id', 'Ejercicio', 'Sesión', 'Series', 'Reps']]);
    ss.setActiveSheet(previa);
  }
  return h;
}

// Texto de una celda; las fechas (Sheets convierte "12-15" en fecha si la celda no es
// de texto) no se pueden recuperar, se descartan.
function textoCelda(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return '';
  return String(v == null ? '' : v).trim();
}

function leerEjercicios() {
  const h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_EJERCICIOS);
  if (!h) return [];
  return h.getDataRange().getValues().slice(1)
    .map(r => ({ id: textoCelda(r[0]), sets: textoCelda(r[3]), reps: textoCelda(r[4]) }))
    .filter(e => e.id && e.sets && e.reps);
}

// Una fila por ejercicio, buscada por Id (columna A): actualiza si existe, si no agrega.
function guardarEjercicio(id, cfg) {
  const h = hojaEjercicios();
  h.getRange('D:E').setNumberFormat('@'); // texto, para que "12-15" no se convierta en fecha
  const ids = h.getRange(1, 1, Math.max(h.getLastRow(), 1), 1).getValues().map(r => textoCelda(r[0]));
  let fila = ids.indexOf(id) + 1;
  if (fila < 2) fila = Math.max(h.getLastRow(), 1) + 1;
  h.getRange(fila, 1, 1, 5).setNumberFormat('@')
    .setValues([[id, String(cfg.nombre || ''), String(cfg.sesion || ''), String(cfg.sets), String(cfg.reps)]]);
}

function fechaISO(valor) {
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(valor).trim();
}

// Devuelve {startDate, weeks, weeklyGoal} o null si falta algún dato.
function leerPlan() {
  const h = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HOJA_PLAN);
  if (!h) return null;
  const v = h.getRange('B2:B4').getValues().map(r => r[0]);
  const startDate = fechaISO(v[0]);
  const weeks = Number(v[1]);
  const weeklyGoal = Number(v[2]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !(weeks > 0) || !(weeklyGoal > 0)) return null;
  return { startDate, weeks, weeklyGoal };
}

function guardarPlan(cfg) {
  const h = hojaPlan();
  h.getRange('B2').setNumberFormat('@').setValue(String(cfg.startDate));
  h.getRange('B3').setValue(Number(cfg.weeks));
  h.getRange('B4').setValue(Number(cfg.weeklyGoal));
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const sheet = hojaRegistros();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  // El plan viaja como una fila más, con el formato que la app ya sabe leer.
  const plan = leerPlan();
  if (plan) {
    data.push({ Fecha: 'config', Hora: '', 'Día': DIA_PLAN, Ejercicio: 'config', Carga: JSON.stringify(plan), Reps: '—', Completado: '' });
  }
  // Series y reps por ejercicio, una fila por Id.
  leerEjercicios().forEach(e => {
    data.push({ Fecha: 'config', Hora: '', 'Día': DIA_EJERCICIOS, Ejercicio: e.id, Carga: JSON.stringify({ sets: e.sets, reps: e.reps }), Reps: '—', Completado: '' });
  });
  return respuesta({ ok: true, version: VERSION, data });
}

// La columna Fecha puede volver como texto "dd/mm/aa" o, si Sheets la
// autoconvirtió, como objeto Date — normalizamos a "dd/mm/aa" para poder
// comparar siempre contra el string que manda el HTML.
function normalizarFecha(valor) {
  if (Object.prototype.toString.call(valor) === '[object Date]') {
    return Utilities.formatDate(valor, Session.getScriptTimeZone(), 'dd/MM/yy');
  }
  return String(valor);
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);

  // Plan: va a la pestaña "Plan", nunca a la hoja de registros.
  if (data.dia === DIA_PLAN) {
    try {
      const cfg = JSON.parse(data.carga);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(cfg.startDate)) || !(Number(cfg.weeks) > 0) || !(Number(cfg.weeklyGoal) > 0)) {
        return respuesta({ ok: false, error: 'plan invalido' });
      }
      guardarPlan(cfg);
      return respuesta({ ok: true, plan: true });
    } catch (err) {
      return respuesta({ ok: false, error: 'plan invalido' });
    }
  }

  // Series y reps de un ejercicio: a la pestaña "Ejercicios", nunca al log.
  if (data.dia === DIA_EJERCICIOS) {
    try {
      const cfg = JSON.parse(data.carga);
      const id = String(data.ejercicio || '').trim();
      if (!id || !String(cfg.sets).trim() || !String(cfg.reps).trim() || String(cfg.sets).length > 6 || String(cfg.reps).length > 40) {
        return respuesta({ ok: false, error: 'ejercicio invalido' });
      }
      guardarEjercicio(id, cfg);
      return respuesta({ ok: true, ejercicio: true });
    } catch (err) {
      return respuesta({ ok: false, error: 'ejercicio invalido' });
    }
  }

  const sheet = hojaRegistros();
  const completado = data.completado || '';

  // Un registro por día y ejercicio: si ya existe una fila de HOY para este
  // día+ejercicio+estado (completado o carga/reps), la pisa en vez de sumar
  // una fila nueva por cada edición.
  const rows = sheet.getDataRange().getValues();
  for (let i = rows.length - 1; i >= 1; i--) {
    const mismoEstado = (rows[i][6] || '') === completado;
    if (rows[i][2] === data.dia && rows[i][3] === data.ejercicio && normalizarFecha(rows[i][0]) === data.fecha && mismoEstado) {
      sheet.getRange(i + 1, 1, 1, 7).setValues([[data.fecha, data.hora, data.dia, data.ejercicio, data.carga, data.reps, completado]]);
      return respuesta({ ok: true, updated: true });
    }
  }

  sheet.appendRow([data.fecha, data.hora, data.dia, data.ejercicio, data.carga, data.reps, completado]);
  return respuesta({ ok: true, inserted: true });
}
