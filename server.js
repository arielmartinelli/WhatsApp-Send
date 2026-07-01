const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const path = require('path');

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
let campaignStatus = 'STOPPED'; // STOPPED, RUNNING, PAUSED, FINISHED
let campaignDelays = { min: 10, max: 25 }; // en segundos
let currentTimeout = null;

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

    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: path.join(__dirname, '.wwebjs_auth')
        }),
        puppeteer: {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
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
        
        // WhatsApp requiere el formato de chat id: numero@c.us
        const chatId = `${cleanPhone}@c.us`;

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
    io.emit('campaign-status', { status: campaignStatus, index: campaignIndex, total: campaignQueue.length });

    if (campaignIndex < campaignQueue.length && campaignStatus === 'RUNNING') {
        // Calcular delay aleatorio entre min y max en milisegundos
        const minMs = campaignDelays.min * 1000;
        const maxMs = campaignDelays.max * 1000;
        const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

        console.log(`Esperando ${delay / 1000} segundos antes del siguiente envío...`);
        currentTimeout = setTimeout(sendNextMessage, delay);
    } else if (campaignIndex >= campaignQueue.length) {
        campaignStatus = 'FINISHED';
        io.emit('campaign-status', { status: campaignStatus, index: campaignIndex, total: campaignQueue.length });
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
        delays: campaignDelays
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
        if (whatsappStatus !== 'CONNECTED') {
            socket.emit('error-msg', 'WhatsApp no está conectado. Por favor escanea el QR.');
            return;
        }

        if (campaignStatus === 'RUNNING') {
            return;
        }

        // Si es una campaña nueva (o reinicio de una terminada)
        if (campaignStatus === 'STOPPED' || campaignStatus === 'FINISHED') {
            campaignQueue = data.leads.map(lead => ({ ...lead, status: 'pending', error: null }));
            campaignIndex = 0;
        }

        campaignDelays = data.delays || { min: 10, max: 25 };
        campaignStatus = 'RUNNING';
        
        io.emit('campaign-status', { 
            status: campaignStatus, 
            index: campaignIndex, 
            total: campaignQueue.length,
            queue: campaignQueue
        });

        sendNextMessage();
    });

    // Acción: Pausar campaña
    socket.on('pause-campaign', () => {
        if (campaignStatus !== 'RUNNING') return;
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
        io.emit('campaign-status', { status: campaignStatus, index: campaignIndex, total: 0, queue: [] });
        console.log('Campaña detenida y cola limpiada');
    });
});

server.listen(PORT, () => {
    console.log(`Servidor local corriendo en http://localhost:${PORT}`);
});
