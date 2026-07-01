const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Servir archivos estáticos de la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Estado de WhatsApp y de la campaña en memoria
let whatsappStatus = 'DISCONNECTED'; // DISCONNECTED, CONNECTING, QR_READY, CONNECTED
let qrCodeData = null;
let clientInfo = null;

let campaignQueue = [];
let campaignIndex = 0;
let campaignStatus = 'STOPPED'; // STOPPED, RUNNING, PAUSED, FINISHED, BATCH_WAIT
let campaignDelays = { min: 10, max: 25 }; // en segundos
let currentTimeout = null;
let campaignBatchSize = 20;
let campaignBatchDelay = 300; // en segundos (5 min)
let messagesSentInCurrentBatch = 0;
let batchCooldownEndTime = null;

// Inicializar cliente de WhatsApp
let client = null;

function initWhatsApp() {
    if (client) {
        try {
            client.destroy();
        } catch (e) {
            console.error("Error al destruir cliente anterior:", e);
        }
    }

    whatsappStatus = 'CONNECTING';
    qrCodeData = null;
    clientInfo = null;
    io.emit('status-update', { status: whatsappStatus });

    // Buscar Chrome en el sistema para evitar descargar Chromium y reducir tamaño de la App empaquetada
    function getWindowsChromePath() {
        const paths = [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
        ];
        for (const p of paths) {
            if (fs.existsSync(p)) return p;
        }
        return null;
    }

    let chromePath = null;
    if (process.platform === 'win32') {
        chromePath = getWindowsChromePath();
    } else if (process.platform === 'darwin') {
        if (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')) {
            chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        }
    } else if (process.platform === 'linux') {
        if (fs.existsSync('/usr/bin/google-chrome')) {
            chromePath = '/usr/bin/google-chrome';
        }
    }

    const puppeteerOptions = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    };

    if (chromePath) {
        puppeteerOptions.executablePath = chromePath;
        console.log(`Usando Chrome del sistema: ${chromePath}`);
    } else {
        console.log("Google Chrome no detectado en directorios estándar. Usando Chromium de Puppeteer.");
    }

    const userHome = require('os').homedir();
    const authPath = path.join(userHome, '.wa_automator_auth');
    console.log(`Guardando sesión de WhatsApp en: ${authPath}`);

    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: authPath
        }),
        puppeteer: puppeteerOptions
    });

    client.on('qr', (qr) => {
        whatsappStatus = 'QR_READY';
        QRCode.toDataURL(qr, (err, url) => {
            if (err) {
                console.error("Error generando código QR:", err);
                return;
            }
            qrCodeData = url;
            io.emit('status-update', { 
                status: whatsappStatus, 
                qr: qrCodeData 
            });
        });
    });

    client.on('ready', () => {
        whatsappStatus = 'CONNECTED';
        clientInfo = {
            pushname: client.info.pushname,
            wid: client.info.wid.user
        };
        qrCodeData = null;
        io.emit('status-update', { 
            status: whatsappStatus,
            info: clientInfo
        });
        console.log('Cliente de WhatsApp listo!');
    });

    client.on('authenticated', () => {
        console.log('Autenticado con éxito en WhatsApp');
    });

    client.on('auth_failure', (msg) => {
        whatsappStatus = 'DISCONNECTED';
        console.error('Fallo en la autenticación:', msg);
        io.emit('status-update', { status: whatsappStatus, error: msg });
    });

    client.on('disconnected', (reason) => {
        whatsappStatus = 'DISCONNECTED';
        clientInfo = null;
        console.log('Cliente desconectado:', reason);
        io.emit('status-update', { status: whatsappStatus, reason: reason });
        // Intentar reinicializar
        setTimeout(initWhatsApp, 5000);
    });

    client.initialize().catch(err => {
        console.error("Error al inicializar cliente:", err);
        whatsappStatus = 'DISCONNECTED';
        io.emit('status-update', { status: whatsappStatus, error: err.message });
    });
}

// Iniciar WhatsApp al arrancar el servidor
initWhatsApp();

// Cola de Envío de Mensajes (Campaign Loop)
async function sendNextMessage() {
    if (campaignStatus !== 'RUNNING') return;

    // Verificar si terminamos
    if (campaignIndex >= campaignQueue.length) {
        campaignStatus = 'FINISHED';
        io.emit('campaign-status', { status: campaignStatus, index: campaignIndex, total: campaignQueue.length });
        return;
    }

    const lead = campaignQueue[campaignIndex];
    lead.status = 'sending';
    io.emit('message-status', { id: lead.id, status: 'sending' });

    try {
        if (whatsappStatus !== 'CONNECTED') {
            throw new Error("WhatsApp no está conectado");
        }

        // Sanitizar el número de teléfono
        // Eliminar +, espacios, guiones y otros caracteres no numéricos
        let cleanPhone = lead.phone.replace(/\D/g, '');
        
        console.log(`Resolviendo número en WhatsApp para: ${cleanPhone}...`);
        const numberId = await client.getNumberId(cleanPhone);
        
        let chatId;
        if (numberId) {
            chatId = numberId._serialized;
            console.log(`Número de WhatsApp verificado y resuelto: ${chatId}`);
        } else {
            // Si getNumberId no lo encuentra, hacemos fallback al formato estándar
            // pero avisamos en consola
            chatId = `${cleanPhone}@c.us`;
            console.warn(`getNumberId no pudo verificar el número ${cleanPhone}. Usando formato fallback.`);
        }

        // Enviar el mensaje
        await client.sendMessage(chatId, lead.text);
        
        lead.status = 'sent';
        io.emit('message-status', { id: lead.id, status: 'sent' });
        console.log(`Mensaje enviado a ${cleanPhone} (${lead.name})`);
    } catch (error) {
        console.error(`Error enviando a ${lead.phone}:`, error);
        lead.status = 'failed';
        lead.error = error.message;
        io.emit('message-status', { id: lead.id, status: 'failed', error: error.message });
    }

    campaignIndex++;
    messagesSentInCurrentBatch++;

    const hasMoreLeads = campaignIndex < campaignQueue.length;
    const reachedBatchLimit = messagesSentInCurrentBatch >= campaignBatchSize;

    if (hasMoreLeads && reachedBatchLimit) {
        // Entrar en cooldown de lote
        campaignStatus = 'BATCH_WAIT';
        messagesSentInCurrentBatch = 0;
        batchCooldownEndTime = Date.now() + (campaignBatchDelay * 1000);

        io.emit('campaign-status', { 
            status: campaignStatus, 
            index: campaignIndex, 
            total: campaignQueue.length,
            cooldownEndTime: batchCooldownEndTime
        });

        console.log(`Lote de ${campaignBatchSize} completado. Esperando ${campaignBatchDelay} segundos para el siguiente lote...`);
        currentTimeout = setTimeout(() => {
            campaignStatus = 'RUNNING';
            sendNextMessage();
        }, campaignBatchDelay * 1000);
    } else {
        io.emit('campaign-status', { 
            status: campaignStatus, 
            index: campaignIndex, 
            total: campaignQueue.length,
            cooldownEndTime: null
        });

        if (hasMoreLeads && campaignStatus === 'RUNNING') {
            const minMs = campaignDelays.min * 1000;
            const maxMs = campaignDelays.max * 1000;
            const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

            console.log(`Esperando ${delay / 1000} segundos antes del siguiente envío...`);
            currentTimeout = setTimeout(sendNextMessage, delay);
        } else if (!hasMoreLeads) {
            campaignStatus = 'FINISHED';
            io.emit('campaign-status', { 
                status: campaignStatus, 
                index: campaignIndex, 
                total: campaignQueue.length,
                cooldownEndTime: null
            });
        }
    }
}

// Websockets Handler
io.on('connection', (socket) => {
    console.log('Cliente web conectado al servidor local');

    // Enviar estado actual al cliente que se conecta
    socket.emit('status-update', { 
        status: whatsappStatus, 
        qr: qrCodeData,
        info: clientInfo
    });

    socket.emit('campaign-status', {
        status: campaignStatus,
        index: campaignIndex,
        total: campaignQueue.length,
        queue: campaignQueue,
        delays: campaignDelays,
        batchSize: campaignBatchSize,
        batchDelay: campaignBatchDelay,
        cooldownEndTime: batchCooldownEndTime
    });

    // Acción: Inicializar/Reiniciar conexión de WhatsApp
    socket.on('reconnect-whatsapp', () => {
        initWhatsApp();
    });

    // Acción: Cerrar sesión
    socket.on('logout-whatsapp', async () => {
        if (client) {
            try {
                await client.logout();
                whatsappStatus = 'DISCONNECTED';
                clientInfo = null;
                qrCodeData = null;
                io.emit('status-update', { status: whatsappStatus });
                console.log('Cerrado de sesión exitoso');
            } catch (error) {
                console.error("Error al cerrar sesión:", error);
                // Si falla el logout limpio, destruimos e inicializamos
                initWhatsApp();
            }
        }
    });

    // Acción: Iniciar campaña
    socket.on('start-campaign', (data) => {
        // data.leads: array de { id, name, phone, text }
        // data.delays: { min, max }
        // data.batchSize, data.batchDelay
        if (whatsappStatus !== 'CONNECTED') {
            socket.emit('error-msg', 'WhatsApp no está conectado. Por favor escanea el QR.');
            return;
        }

        if (campaignStatus === 'RUNNING' || campaignStatus === 'BATCH_WAIT') {
            return;
        }

        // Si es una campaña nueva (o reinicio de una terminada)
        if (campaignStatus === 'STOPPED' || campaignStatus === 'FINISHED') {
            campaignQueue = data.leads.map(lead => ({ ...lead, status: 'pending', error: null }));
            campaignIndex = 0;
            messagesSentInCurrentBatch = 0;
            batchCooldownEndTime = null;
        }

        campaignDelays = data.delays || { min: 10, max: 25 };
        campaignBatchSize = data.batchSize || 20;
        campaignBatchDelay = data.batchDelay || 300; // en segundos

        campaignStatus = 'RUNNING';
        
        io.emit('campaign-status', { 
            status: campaignStatus, 
            index: campaignIndex, 
            total: campaignQueue.length,
            queue: campaignQueue,
            cooldownEndTime: null
        });

        sendNextMessage();
    });

    // Acción: Pausar campaña
    socket.on('pause-campaign', () => {
        if (campaignStatus !== 'RUNNING' && campaignStatus !== 'BATCH_WAIT') return;
        campaignStatus = 'PAUSED';
        if (currentTimeout) {
            clearTimeout(currentTimeout);
            currentTimeout = null;
        }
        io.emit('campaign-status', { status: campaignStatus, index: campaignIndex, total: campaignQueue.length });
        console.log('Campaña pausada');
    });

    // Acción: Reanudar campaña
    socket.on('resume-campaign', () => {
        if (campaignStatus !== 'PAUSED') return;
        campaignStatus = 'RUNNING';
        // Resetear contador del lote al reanudar manualmente
        messagesSentInCurrentBatch = 0;
        batchCooldownEndTime = null;
        io.emit('campaign-status', { status: campaignStatus, index: campaignIndex, total: campaignQueue.length });
        console.log('Campaña reanudada');
        sendNextMessage();
    });

    // Acción: Detener y limpiar campaña
    socket.on('stop-campaign', () => {
        campaignStatus = 'STOPPED';
        if (currentTimeout) {
            clearTimeout(currentTimeout);
            currentTimeout = null;
        }
        campaignQueue = [];
        campaignIndex = 0;
        messagesSentInCurrentBatch = 0;
        batchCooldownEndTime = null;
        io.emit('campaign-status', { status: campaignStatus, index: campaignIndex, total: 0, queue: [] });
        console.log('Campaña detenida y cola limpiada');
    });
});

server.listen(PORT, () => {
    console.log(`Servidor local corriendo en http://localhost:${PORT}`);
});
