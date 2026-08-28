// Este archivo vive en Google Apps Script (Extensiones > Apps Script del
// Google Sheet), NO en el repo de GitHub. Se incluye acá solo como
// referencia para que Claude Code sepa qué backend está corriendo hoy.
//
// Para modificarlo hay que ir directo a script.google.com y hacer
// "Implementar > Nueva implementación" (o gestionar implementaciones)
// después de editar. La URL del endpoint (SHEETS_URL en el HTML) no cambia
// mientras se reutilice el mismo deployment.
//
// Columnas del Sheet (headers en fila 1, tal cual, con mayúscula/tilde):
// Fecha | Hora | Día | Ejercicio | Carga | Reps | Completado

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  const data = rows.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
  return ContentService.createTextOutput(JSON.stringify({ ok: true, data }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);

  if (data.completado === 'sí') {
    const rows = sheet.getDataRange().getValues();
    for (let i = rows.length - 1; i >= 1; i--) {
      if (rows[i][2] === data.dia && rows[i][3] === data.ejercicio && rows[i][0] === data.fecha && rows[i][6] === 'sí') {
        sheet.getRange(i + 1, 1, 1, 7).setValues([[data.fecha, data.hora, data.dia, data.ejercicio, data.carga, data.reps, data.completado]]);
        return ContentService.createTextOutput(JSON.stringify({ ok: true, updated: true }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
  }

  sheet.appendRow([data.fecha, data.hora, data.dia, data.ejercicio, data.carga, data.reps, data.completado || '']);
  return ContentService.createTextOutput(JSON.stringify({ ok: true, inserted: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
