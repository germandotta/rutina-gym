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

const HOJA_PLAN = 'Plan';
const DIA_PLAN = '__plan__';

// Hoja de registros: la activa de siempre, salvo que "Plan" haya quedado activa
// (por ejemplo al crearse sola); en ese caso, la primera hoja que no sea Plan.
function hojaRegistros() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const activa = ss.getActiveSheet();
  if (activa.getName() !== HOJA_PLAN) return activa;
  return ss.getSheets().find(h => h.getName() !== HOJA_PLAN);
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
  return respuesta({ ok: true, data });
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
