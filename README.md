# Rutina Gimnasio - PWA

## ¿Qué es esto?

Una Progressive Web App (PWA) para tu rutina de rehabilitación de rodillas. Se instala en tu iPhone como una app nativa y funciona offline.

## Cómo instalarla en tu iPhone

### OPCIÓN 1: Subir a un hosting (recomendado)

1. **Subir archivos a GitHub Pages, Netlify o Vercel:**
   - Crear un repositorio en GitHub
   - Subir TODOS los archivos de esta carpeta
   - Activar GitHub Pages en Settings
   - O usar Netlify drag & drop

2. **Instalar en iPhone:**
   - Abrir la URL en Safari
   - Tocar el botón "Compartir" (cuadrado con flecha hacia arriba)
   - Scroll hacia abajo y tocar "Añadir a pantalla de inicio"
   - Se crea un ícono en tu home screen
   - Abrirla y funciona como una app nativa

### OPCIÓN 2: Instalar desde Mac (sin hosting)

**PROBLEMA:** PWA necesita HTTPS o localhost para funcionar. Desde archivos locales no se puede registrar el service worker.

**Solución temporal:**
1. En la Mac, abrir Terminal
2. Ir a la carpeta donde están los archivos:
   ```bash
   cd /ruta/a/la/carpeta
   ```
3. Levantar un servidor local:
   ```bash
   python3 -m http.server 8000
   ```
4. En el iPhone (conectado a la misma red WiFi):
   - Averiguar la IP de tu Mac: System Settings > Network > WiFi > Details
   - Abrir Safari y navegar a `http://[IP-DE-TU-MAC]:8000/rutina-gym-lunes.html`
   - Ejemplo: `http://192.168.1.100:8000/rutina-gym-lunes.html`
   - Tocar "Compartir" > "Añadir a pantalla de inicio"

**Nota:** Con esta opción, la app solo funciona cuando estés en la misma red WiFi que tu Mac y el servidor esté corriendo.

## Archivos incluidos

- `rutina-gym-lunes.html` - App principal
- `manifest.json` - Configuración PWA
- `service-worker.js` - Cache para funcionar offline
- `icon-192.png` y `icon-512.png` - Íconos de la app
- `img_*.png` - 16 imágenes de ejercicios

## Funcionalidades

- ✅ 3 días de rutina (Lunes, Miércoles, Viernes)
- ✅ Timer de descanso entre series
- ✅ Marcar ejercicios como completados
- ✅ Barra de progreso
- ✅ Dark mode
- ✅ Fotos reales de cada ejercicio
- ✅ Funciona offline (una vez instalada)
- ✅ Sin scroll, optimizada para iPhone SE

## Próximos pasos

1. Generar rutinas de Miércoles y Viernes
2. Mejorar íconos (actualmente son placeholders verdes)
3. Agregar notificaciones para recordar entrenar

## Notas técnicas

- La app cachea todos los recursos en la primera carga
- Funciona 100% offline después de instalada
- No consume datos después de la primera carga
- El cache se limpia automáticamente al actualizar la versión
