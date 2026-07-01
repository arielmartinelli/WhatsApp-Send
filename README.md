# WhatsApp Lead Sender - Automático & Gratis

Esta es una aplicación local gratuita diseñada para enviar mensajes de WhatsApp de forma automática e individualizada a múltiples leads cargados directamente desde Excel, Google Sheets o archivos CSV.

La herramienta corre completamente en tu computadora para garantizar la **privacidad total** de tus datos de contacto y utiliza la conexión oficial de tu teléfono mediante WhatsApp Web.

## Características

*   **Pega directamente desde Excel/Google Sheets:** Solo tienes que copiar las columnas de tu hoja de cálculo y pegarlas en la aplicación.
*   **Mensajes Personalizados:** Redacta una plantilla y usa variables como `{Nombre}` para que cada mensaje contenga el nombre de la persona.
*   **Conexión persistente:** Escanea el código QR de WhatsApp Web Business o Personal una sola vez. La sesión se guardará localmente.
*   **Prevención de bloqueos (Antiban):** Envía con delays aleatorios personalizables entre cada mensaje (ej. 10 a 25 segundos) para simular comportamiento humano.
*   **Envío de prueba:** Envía un mensaje de prueba a tu propio número antes de iniciar la campaña.
*   **Reportes de envío:** Descarga un reporte en formato CSV cuando finalice el envío para ver cuáles mensajes fueron entregados con éxito y cuáles fallaron.

## Requisitos Previos

Tener instalado **Node.js** en tu sistema (versión 18 o superior). Puedes descargarlo gratis desde [nodejs.org](https://nodejs.org/).

## Instalación y Arranque

1.  Abre una terminal o consola de comandos (PowerShell o CMD en Windows) en esta carpeta.
2.  Si estás ejecutando por primera vez y las dependencias no están instaladas, ejecuta el comando para instalar las librerías necesarias:
    ```bash
    npm install
    ```
    *(Esto descargará automáticamente el motor Chromium interno para ejecutar el automatizador).*

3.  Inicia el servidor local:
    ```bash
    npm start
    ```

4.  Abre tu navegador de internet favorito e ingresa a la siguiente dirección:
    ```text
    http://localhost:3000
    ```

## Guía de Uso Rápido

1.  **Paso 1 (Conectar):** Espera a que la aplicación genere un código QR en pantalla y escanéalo con tu aplicación móvil de WhatsApp (Sección: *Dispositivos vinculados* -> *Vincular dispositivo*).
2.  **Paso 2 (Cargar):** Ve a la pestaña **Cargar Leads**. Copia tus celdas de Excel/Google Sheets (incluyendo los títulos de columna como *Nombre* y *Telefono*) y pégalas en el cuadro de texto. Presiona **Procesar y Analizar**.
3.  **Paso 3 (Redactar):** Ve a la pestaña **Plantilla**. Redacta tu mensaje e introduce variables usando los botones dinámicos (ej: `Hola {Nombre}, ...`). Podrás ver una vista previa en tiempo real en la pantalla de simulación de chat de WhatsApp.
4.  **Paso 4 (Enviar):** En la pestaña **Consola de Envío**, ajusta los segundos de espera que desees (recomendado: mínimo 10, máximo 25 segundos) y presiona **Iniciar Envío**. Observa el progreso fila por fila. Al finalizar, descarga el reporte si lo deseas.

---

*Desarrollado de forma local y 100% gratuita.*
