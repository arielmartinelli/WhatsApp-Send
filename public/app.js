// Inicializar Socket.io
const socket = io();

// Elementos de la interfaz - Navegación
const navButtons = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const pageTitle = document.getElementById('page-title');
const pageSubtitle = document.getElementById('page-subtitle');

// Elementos de la interfaz - Estado de WhatsApp
const sideStatusDot = document.getElementById('side-status-dot');
const sideStatusText = document.getElementById('side-status-text');
const headerStatusBadge = document.getElementById('header-status-badge');
const headerStatusText = document.getElementById('header-status-text');
const headerStatusIcon = document.getElementById('header-status-icon');

// Estados del QR/Conexión
const stateDisconnected = document.getElementById('state-disconnected');
const stateConnecting = document.getElementById('state-connecting');
const stateQrReady = document.getElementById('state-qr-ready');
const stateConnected = document.getElementById('state-connected');
const qrCodeImg = document.getElementById('qr-code-img');
const qrLoadingOverlay = document.getElementById('qr-loading-overlay');
const btnRefreshQr = document.getElementById('btn-refresh-qr');
const btnLogoutWa = document.getElementById('btn-logout-wa');
const whatsappUserName = document.getElementById('whatsapp-user-name');
const whatsappUserPhone = document.getElementById('whatsapp-user-phone');

// Elementos de la interfaz - Leads
const leadsPasteArea = document.getElementById('leads-paste-area');
const csvFileInput = document.getElementById('csv-file-input');
const btnClearLeads = document.getElementById('btn-clear-leads');
const btnProcessLeads = document.getElementById('btn-process-leads');
const cardLeadsPreview = document.getElementById('card-leads-preview');
const selectPhoneCol = document.getElementById('select-phone-col');
const selectNameCol = document.getElementById('select-name-col');
const leadsTableBody = document.getElementById('leads-table-body');
const leadsCountText = document.getElementById('leads-count-text');

// Elementos de la interfaz - Plantilla
const templateTextArea = document.getElementById('template-text-area');
const variableButtonsContainer = document.getElementById('variable-buttons');
const previewContactName = document.getElementById('preview-contact-name');
const chatPreviewText = document.getElementById('chat-preview-text');

// Elementos de la interfaz - Consola
const delayMinInput = document.getElementById('delay-min');
const delayMaxInput = document.getElementById('delay-max');
const btnStartCampaign = document.getElementById('btn-start-campaign');
const btnPauseCampaign = document.getElementById('btn-pause-campaign');
const btnStopCampaign = document.getElementById('btn-stop-campaign');
const testPhoneInput = document.getElementById('test-phone-input');
const btnSendTestMsg = document.getElementById('btn-send-test-msg');
const campaignStateBadge = document.getElementById('campaign-state-badge');
const campaignProgressBar = document.getElementById('campaign-progress-bar');
const campaignProgressNumbers = document.getElementById('campaign-progress-numbers');
const campaignProgressPercent = document.getElementById('campaign-progress-percent');
const consoleTableBody = document.getElementById('console-table-body');
const btnExportReport = document.getElementById('btn-export-report');

// Datos en memoria en el Frontend
let parsedHeaders = [];
let parsedRows = []; // array de objetos con las celdas
let selectedPhoneCol = '';
let selectedNameCol = '';
let wwebjsStatus = 'DISCONNECTED';
let campaignData = {
    status: 'STOPPED',
    index: 0,
    total: 0,
    queue: []
};

// 1. Manejo de Pestañas (Tabs)
const tabTitles = {
    'tab-dashboard': { title: 'Conexión con WhatsApp', subtitle: 'Vincular tu cuenta de WhatsApp Business o Personal' },
    'tab-leads': { title: 'Cargar Leads', subtitle: 'Importar números y nombres desde Excel, Sheets o CSV' },
    'tab-template': { title: 'Plantilla de Mensaje', subtitle: 'Redactar el texto personalizado para el envío' },
    'tab-console': { title: 'Consola de Control', subtitle: 'Supervisar y ejecutar la campaña de envío' }
};

navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        
        // Activar botón de navegación
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        // Mostrar pestaña activa
        tabContents.forEach(tab => {
            if (tab.id === targetTab) {
                tab.classList.remove('hidden');
            } else {
                tab.classList.add('hidden');
            }
        });

        // Actualizar Header
        if (tabTitles[targetTab]) {
            pageTitle.textContent = tabTitles[targetTab].title;
            pageSubtitle.textContent = tabTitles[targetTab].subtitle;
        }
    });
});

// 2. Eventos de Conexión de WhatsApp (Socket.io)
socket.on('status-update', (data) => {
    wwebjsStatus = data.status;
    updateStatusIndicators(data);
});

function updateStatusIndicators(data) {
    // Resetear clases
    sideStatusDot.className = 'status-indicator-dot';
    headerStatusBadge.className = 'connection-badge';
    headerStatusIcon.className = 'fas';

    // Ocultar todos los estados de la tarjeta QR
    stateDisconnected.classList.add('hidden');
    stateConnecting.classList.add('hidden');
    stateQrReady.classList.add('hidden');
    stateConnected.classList.add('hidden');

    switch (data.status) {
        case 'DISCONNECTED':
            sideStatusDot.classList.add('disconnected');
            sideStatusText.textContent = 'Desconectado';
            headerStatusBadge.classList.add('disconnected');
            headerStatusText.textContent = 'Sin Conexión';
            headerStatusIcon.classList.add('fa-plug');
            stateDisconnected.classList.remove('hidden');
            btnStartCampaign.disabled = true;
            break;

        case 'CONNECTING':
            sideStatusDot.classList.add('connecting');
            sideStatusText.textContent = 'Conectando...';
            headerStatusBadge.classList.add('connecting');
            headerStatusText.textContent = 'Abriendo WhatsApp Web...';
            headerStatusIcon.classList.add('fa-circle-notch', 'fa-spin');
            stateConnecting.classList.remove('hidden');
            btnStartCampaign.disabled = true;
            break;

        case 'QR_READY':
            sideStatusDot.classList.add('connecting');
            sideStatusText.textContent = 'Esperando QR';
            headerStatusBadge.classList.add('connecting');
            headerStatusText.textContent = 'Escanear Código QR';
            headerStatusIcon.classList.add('fa-qrcode');
            
            if (data.qr) {
                qrCodeImg.src = data.qr;
                stateQrReady.classList.remove('hidden');
            } else {
                stateConnecting.classList.remove('hidden'); // Fallback si el QR aún no llega
            }
            btnStartCampaign.disabled = true;
            break;

        case 'CONNECTED':
            sideStatusDot.classList.add('connected');
            sideStatusText.textContent = 'Conectado';
            headerStatusBadge.classList.add('connected');
            headerStatusText.textContent = 'Listo / Conectado';
            headerStatusIcon.classList.add('fa-link');
            
            if (data.info) {
                whatsappUserName.textContent = data.info.pushname || 'WhatsApp Business';
                whatsappUserPhone.textContent = `+${data.info.wid}`;
            }
            stateConnected.classList.remove('hidden');
            
            // Habilitar controles de envío si hay leads cargados
            updateConsoleButtonsState();
            break;
    }
}

// Acciones de WhatsApp
btnRefreshQr.addEventListener('click', () => {
    qrLoadingOverlay.classList.remove('hidden');
    socket.emit('reconnect-whatsapp');
});

btnLogoutWa.addEventListener('click', () => {
    if (confirm('¿Seguro que deseas cerrar la sesión en este navegador local?')) {
        socket.emit('logout-whatsapp');
    }
});

// 3. Procesar Carga de Leads (Sheets / Excel Paste / CSV)
btnProcessLeads.addEventListener('click', () => {
    const pasteContent = leadsPasteArea.value.trim();
    if (!pasteContent) {
        alert('Por favor, pega datos de Excel/Sheets o sube un CSV primero.');
        return;
    }
    processPasteData(pasteContent);
});

btnClearLeads.addEventListener('click', () => {
    leadsPasteArea.value = '';
    csvFileInput.value = '';
    cardLeadsPreview.classList.add('hidden');
    parsedHeaders = [];
    parsedRows = [];
    selectedPhoneCol = '';
    selectedNameCol = '';
    updateConsoleButtonsState();
});

// Parser de datos pegados (separados por tabulación \t o coma/punto y coma)
function processPasteData(text) {
    const lines = text.split(/\r?\n/);
    if (lines.length < 2) {
        alert('Datos insuficientes. Se requiere una fila de encabezado y al menos una fila de datos.');
        return;
    }

    // Auto-detectar separador
    const firstLine = lines[0];
    let separator = '\t';
    if (firstLine.includes('\t')) {
        separator = '\t';
    } else if (firstLine.includes(';')) {
        separator = ';';
    } else if (firstLine.includes(',')) {
        separator = ',';
    }

    // Parsear encabezados
    parsedHeaders = firstLine.split(separator).map(h => h.trim());

    // Parsear filas
    parsedRows = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        const cells = lines[i].split(separator).map(c => c.trim());
        const rowObject = {};
        
        parsedHeaders.forEach((header, index) => {
            rowObject[header] = cells[index] || '';
        });
        
        parsedRows.push(rowObject);
    }

    if (parsedRows.length === 0) {
        alert('No se encontraron filas con datos válidos.');
        return;
    }

    populateColumnSelectors();
    renderLeadsPreviewTable();
    updateVariableButtons();
    cardLeadsPreview.classList.remove('hidden');
    updateConsoleButtonsState();
    
    // Auto-hacer scroll hacia la previsualización
    cardLeadsPreview.scrollIntoView({ behavior: 'smooth' });
}

// Carga de archivo CSV
csvFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        leadsPasteArea.value = evt.target.result;
        processPasteData(evt.target.result);
    };
    reader.readAsText(file);
});

// Configurar dropdowns de columnas
function populateColumnSelectors() {
    selectPhoneCol.innerHTML = '';
    selectNameCol.innerHTML = '';

    // Opción predeterminada vacía para Nombre
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '-- No utilizar --';
    selectNameCol.appendChild(emptyOption);

    parsedHeaders.forEach(header => {
        const optionPhone = document.createElement('option');
        optionPhone.value = header;
        optionPhone.textContent = header;
        
        const optionName = document.createElement('option');
        optionName.value = header;
        optionName.textContent = header;

        selectPhoneCol.appendChild(optionPhone);
        selectNameCol.appendChild(optionName);
    });

    // Auto-detectar teléfono y nombre
    let phoneMatch = parsedHeaders.find(h => /tel|phone|num|cel|movil/i.test(h));
    let nameMatch = parsedHeaders.find(h => /nom|name|cli|lead/i.test(h));

    if (phoneMatch) selectPhoneCol.value = phoneMatch;
    if (nameMatch) selectNameCol.value = nameMatch;

    selectedPhoneCol = selectPhoneCol.value;
    selectedNameCol = selectNameCol.value;

    selectPhoneCol.addEventListener('change', (e) => {
        selectedPhoneCol = e.target.value;
        renderLeadsPreviewTable();
        updatePreview();
    });

    selectNameCol.addEventListener('change', (e) => {
        selectedNameCol = e.target.value;
        renderLeadsPreviewTable();
        updatePreview();
    });
}

// Renderizar tabla de previsualización en pestaña Cargar Leads
function renderLeadsPreviewTable() {
    leadsTableBody.innerHTML = '';
    
    parsedRows.forEach((row, idx) => {
        const tr = document.createElement('tr');
        
        const tdIdx = document.createElement('td');
        tdIdx.textContent = idx + 1;
        tr.appendChild(tdIdx);

        const tdName = document.createElement('td');
        tdName.textContent = selectedNameCol ? row[selectedNameCol] : 'N/A';
        tr.appendChild(tdName);

        const tdPhone = document.createElement('td');
        tdPhone.textContent = selectedPhoneCol ? row[selectedPhoneCol] : 'N/A';
        tr.appendChild(tdPhone);

        const tdExtra = document.createElement('td');
        // Mostrar otros campos que no sean nombre o teléfono
        const extraFields = [];
        parsedHeaders.forEach(h => {
            if (h !== selectedPhoneCol && h !== selectedNameCol) {
                extraFields.push(`<b>${h}:</b> ${row[h]}`);
            }
        });
        tdExtra.innerHTML = extraFields.join(' | ') || '<span class="text-muted">Ninguno</span>';
        tr.appendChild(tdExtra);

        leadsTableBody.appendChild(tr);
    });

    leadsCountText.textContent = `${parsedRows.length} leads cargados listos para enviar.`;
}

// 4. Lógica de Variables y Plantilla
function updateVariableButtons() {
    variableButtonsContainer.innerHTML = '';
    const spanText = document.createElement('span');
    spanText.className = 'text-muted text-sm';
    spanText.textContent = 'Insertar variable: ';
    variableButtonsContainer.appendChild(spanText);

    parsedHeaders.forEach(header => {
        const btn = document.createElement('button');
        btn.className = 'btn btn-tag';
        btn.textContent = `{${header}}`;
        btn.addEventListener('click', () => {
            insertTextAtCursor(templateTextArea, `{${header}}`);
            updatePreview();
        });
        variableButtonsContainer.appendChild(btn);
    });
}

function insertTextAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;
    textarea.value = currentVal.substring(0, start) + text + currentVal.substring(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
}

// Lógica de Vista Previa de WhatsApp (Mock)
templateTextArea.addEventListener('input', updatePreview);

function updatePreview() {
    const template = templateTextArea.value;
    if (!template) {
        chatPreviewText.innerHTML = '<span class="text-muted">Escribe tu plantilla para ver una vista previa personalizada aquí.</span>';
        previewContactName.textContent = 'Lead de Prueba';
        return;
    }

    if (parsedRows.length === 0) {
        chatPreviewText.textContent = template;
        previewContactName.textContent = 'Lead de Prueba';
        return;
    }

    // Usar la primera fila para la vista previa
    const firstRow = parsedRows[0];
    const previewName = selectedNameCol ? firstRow[selectedNameCol] : 'Lead de Prueba';
    previewContactName.textContent = previewName;

    // Compilar el mensaje
    const compiled = compileTemplate(template, firstRow);
    // Convertir saltos de línea a HTML <br>
    chatPreviewText.innerHTML = compiled.replace(/\n/g, '<br>');
}

function compileTemplate(template, row) {
    let result = template;
    parsedHeaders.forEach(header => {
        const value = row[header] || '';
        // Reemplazar globalmente las llaves {Header}
        const regex = new RegExp(`{${escapeRegExp(header)}}`, 'g');
        result = result.replace(regex, value);
    });
    return result;
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 5. Consola y Flujo de Envío (Campaña)
function updateConsoleButtonsState() {
    const isWaConnected = (wwebjsStatus === 'CONNECTED');
    const hasLeads = (parsedRows.length > 0);
    const isCampaignRunning = (campaignData.status === 'RUNNING');
    const isCampaignPaused = (campaignData.status === 'PAUSED');

    if (isWaConnected && hasLeads) {
        if (isCampaignRunning) {
            btnStartCampaign.classList.add('hidden');
            btnPauseCampaign.classList.remove('hidden');
            btnPauseCampaign.disabled = false;
            btnStopCampaign.disabled = false;
        } else if (isCampaignPaused) {
            btnStartCampaign.classList.remove('hidden');
            btnStartCampaign.innerHTML = '<i class="fas fa-play"></i> Reanudar';
            btnStartCampaign.disabled = false;
            btnPauseCampaign.classList.add('hidden');
            btnStopCampaign.disabled = false;
        } else {
            // STOPPED o FINISHED
            btnStartCampaign.classList.remove('hidden');
            btnStartCampaign.innerHTML = '<i class="fas fa-play"></i> Iniciar Envío';
            btnStartCampaign.disabled = false;
            btnPauseCampaign.classList.add('hidden');
            btnStopCampaign.disabled = true;
        }
    } else {
        // WhatsApp desconectado o sin leads cargados
        btnStartCampaign.disabled = true;
        btnStartCampaign.classList.remove('hidden');
        btnStartCampaign.innerHTML = '<i class="fas fa-play"></i> Iniciar Envío';
        btnPauseCampaign.classList.add('hidden');
        btnStopCampaign.disabled = true;
    }
}

// Recibir estado de campaña desde el servidor
socket.on('campaign-status', (data) => {
    campaignData = data;
    updateConsoleUI();
    updateConsoleButtonsState();
});

// Recibir actualización de estado para una fila en específico
socket.on('message-status', (data) => {
    // data: { id, status, error }
    const rowElement = document.getElementById(`console-row-${data.id}`);
    if (rowElement) {
        const tdStatus = rowElement.querySelector('.col-status');
        const tdResult = rowElement.querySelector('.col-result');

        if (data.status === 'sending') {
            tdStatus.innerHTML = '<span class="badge badge-warning"><i class="fas fa-circle-notch fa-spin"></i> Enviando</span>';
        } else if (data.status === 'sent') {
            tdStatus.innerHTML = '<span class="badge badge-success"><i class="fas fa-check"></i> Enviado</span>';
            tdResult.innerHTML = '<span class="success-text">Mensaje enviado ✅</span>';
        } else if (data.status === 'failed') {
            tdStatus.innerHTML = '<span class="badge badge-danger"><i class="fas fa-times"></i> Falló</span>';
            tdResult.innerHTML = `<span class="text-danger" title="${data.error || ''}">Error: ${data.error || 'Número inválido'} ❌</span>`;
        }
    }

    // Actualizar el estado en nuestro arreglo local en memoria si existe
    if (campaignData.queue) {
        const lead = campaignData.queue.find(q => q.id === data.id);
        if (lead) {
            lead.status = data.status;
            lead.error = data.error;
        }
    }
});

socket.on('error-msg', (msg) => {
    alert(msg);
});

function updateConsoleUI() {
    // Actualizar Badge de Estado de Campaña
    campaignStateBadge.className = 'campaign-status-badge';
    if (campaignData.status === 'RUNNING') {
        campaignStateBadge.textContent = 'EJECUTÁNDOSE';
        campaignStateBadge.classList.add('status-running');
    } else if (campaignData.status === 'PAUSED') {
        campaignStateBadge.textContent = 'PAUSADO';
        campaignStateBadge.classList.add('status-paused');
    } else if (campaignData.status === 'FINISHED') {
        campaignStateBadge.textContent = 'COMPLETADO';
        campaignStateBadge.classList.add('status-finished');
    } else {
        campaignStateBadge.textContent = 'DETENIDO';
        campaignStateBadge.classList.add('status-stopped');
    }

    // Actualizar Barra de Progreso
    const total = campaignData.total || 0;
    const index = campaignData.index || 0;
    const percent = total > 0 ? Math.round((index / total) * 100) : 0;

    campaignProgressBar.style.width = `${percent}%`;
    campaignProgressNumbers.textContent = `${index} / ${total} enviados`;
    campaignProgressPercent.textContent = `${percent}%`;

    // Renderizar la tabla de envío en consola si cambió la cola
    if (campaignData.queue && campaignData.queue.length > 0) {
        renderConsoleTable(campaignData.queue);
        btnExportReport.disabled = false;
    } else {
        consoleTableBody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Carga leads en el Paso 2 para verlos aquí.</td></tr>';
        btnExportReport.disabled = true;
    }
}

function renderConsoleTable(queue) {
    // Para no redibujar toda la tabla cada segundo y perder scroll o focos,
    // solo la inicializamos si el número de filas cambia o está vacía.
    if (consoleTableBody.children.length !== queue.length || consoleTableBody.querySelector('td[colspan]')) {
        consoleTableBody.innerHTML = '';
        
        queue.forEach(lead => {
            const tr = document.createElement('tr');
            tr.id = `console-row-${lead.id}`;
            
            const tdName = document.createElement('td');
            tdName.textContent = lead.name || 'N/A';
            tr.appendChild(tdName);

            const tdPhone = document.createElement('td');
            tdPhone.textContent = lead.phone;
            tr.appendChild(tdPhone);

            const tdStatus = document.createElement('td');
            tdStatus.className = 'col-status';
            tdStatus.innerHTML = getStatusBadgeHTML(lead.status);
            tr.appendChild(tdStatus);

            const tdResult = document.createElement('td');
            tdResult.className = 'col-result';
            tdResult.innerHTML = getResultHTML(lead.status, lead.error);
            tr.appendChild(tdResult);

            consoleTableBody.appendChild(tr);
        });
    } else {
        // Actualizar estados puntuales si ya está renderizada
        queue.forEach(lead => {
            const rowElement = document.getElementById(`console-row-${lead.id}`);
            if (rowElement) {
                const tdStatus = rowElement.querySelector('.col-status');
                const tdResult = rowElement.querySelector('.col-result');
                
                // Solo reescribir si cambió para evitar re-renderizados innecesarios
                const currentBadge = tdStatus.innerHTML;
                const newBadge = getStatusBadgeHTML(lead.status);
                if (currentBadge !== newBadge) {
                    tdStatus.innerHTML = newBadge;
                    tdResult.innerHTML = getResultHTML(lead.status, lead.error);
                }
            }
        });
    }
}

function getStatusBadgeHTML(status) {
    switch (status) {
        case 'pending':
            return '<span class="badge status-stopped">Pendiente</span>';
        case 'sending':
            return '<span class="badge badge-warning"><i class="fas fa-circle-notch fa-spin"></i> Enviando</span>';
        case 'sent':
            return '<span class="badge badge-success"><i class="fas fa-check"></i> Enviado</span>';
        case 'failed':
            return '<span class="badge badge-danger"><i class="fas fa-times"></i> Falló</span>';
        default:
            return '<span class="badge status-stopped">Pendiente</span>';
    }
}

function getResultHTML(status, error) {
    if (status === 'sent') {
        return '<span class="success-text">Mensaje enviado ✅</span>';
    } else if (status === 'failed') {
        return `<span class="text-danger" title="${error || ''}">Error: ${error || 'Error desconocido'} ❌</span>`;
    } else if (status === 'sending') {
        return '<span class="text-muted">Procesando...</span>';
    }
    return '<span class="text-muted">-</span>';
}

// Iniciar/Pausar/Detener Campaña
btnStartCampaign.addEventListener('click', () => {
    if (campaignData.status === 'PAUSED') {
        socket.emit('resume-campaign');
        return;
    }

    const minDelay = parseInt(delayMinInput.value) || 10;
    const maxDelay = parseInt(delayMaxInput.value) || 25;

    if (minDelay < 2) {
        alert('El delay mínimo debe ser de al menos 2 segundos.');
        return;
    }
    if (maxDelay < minDelay) {
        alert('El delay máximo debe ser mayor o igual al delay mínimo.');
        return;
    }

    const template = templateTextArea.value.trim();
    if (!template) {
        alert('Por favor redacta la plantilla de mensaje en la pestaña "Plantilla" antes de iniciar.');
        // Cambiar a pestaña plantilla
        document.getElementById('btn-tab-template').click();
        return;
    }

    if (!selectedPhoneCol) {
        alert('Debe mapear una columna de teléfono en la pestaña "Cargar Leads".');
        document.getElementById('btn-tab-leads').click();
        return;
    }

    // Construir la cola de leads
    const leadsToSend = parsedRows.map((row, index) => {
        const phone = row[selectedPhoneCol];
        const name = selectedNameCol ? row[selectedNameCol] : '';
        const compiledMsg = compileTemplate(template, row);

        return {
            id: index + 1,
            name: name,
            phone: phone,
            text: compiledMsg
        };
    });

    socket.emit('start-campaign', {
        leads: leadsToSend,
        delays: { min: minDelay, max: maxDelay }
    });
});

btnPauseCampaign.addEventListener('click', () => {
    socket.emit('pause-campaign');
});

btnStopCampaign.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que deseas detener el envío? Se perderá el progreso de la cola actual.')) {
        socket.emit('stop-campaign');
    }
});

// Envío de Prueba
btnSendTestMsg.addEventListener('click', () => {
    const testPhone = testPhoneInput.value.trim();
    if (!testPhone) {
        alert('Por favor introduce un número de teléfono válido para la prueba.');
        return;
    }

    const template = templateTextArea.value.trim();
    if (!template) {
        alert('Redacta un mensaje en la pestaña Plantilla para enviar de prueba.');
        return;
    }

    // Compilar con la primera fila si hay leads cargados, si no, usar texto crudo
    let compiled = template;
    if (parsedRows.length > 0) {
        compiled = compileTemplate(template, parsedRows[0]);
    } else {
        // Limpiar llaves si no hay leads cargados
        compiled = template.replace(/{[^}]+}/g, '[Dato de prueba]');
    }

    // Deshabilitar botón temporalmente
    btnSendTestMsg.disabled = true;
    btnSendTestMsg.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';

    // Para evitar crear otra cola, creamos una mini campaña temporal de 1 lead en el backend
    // pero solo si whatsapp está conectado
    if (wwebjsStatus !== 'CONNECTED') {
        alert('WhatsApp no está conectado. Escanea el código QR.');
        btnSendTestMsg.disabled = false;
        btnSendTestMsg.textContent = 'Enviar Prueba';
        return;
    }

    // Mandar una mini campaña temporal de prueba al backend
    // o usar un evento directo. Para mantener la simplicidad, mandamos una campaña de 1 elemento
    // que se ejecuta inmediatamente.
    const tempLead = [{
        id: 9999,
        name: 'Prueba Personal',
        phone: testPhone,
        text: compiled
    }];

    // Guardamos la campaña anterior
    const prevQueue = campaignData.queue;
    const prevStatus = campaignData.status;

    // Ejecutamos campaña de prueba
    socket.emit('start-campaign', {
        leads: tempLead,
        delays: { min: 1, max: 2 }
    });

    // Avisamos al usuario que se envió. 
    setTimeout(() => {
        alert(`Se ha solicitado el envío de prueba a: ${testPhone}`);
        btnSendTestMsg.disabled = false;
        btnSendTestMsg.textContent = 'Enviar Prueba';
    }, 1500);
});

// Descargar Reporte CSV
btnExportReport.addEventListener('click', () => {
    if (!campaignData.queue || campaignData.queue.length === 0) return;

    let csvContent = '\uFEFF'; // UTF-8 BOM para Excel
    csvContent += 'Nombre,Telefono,Estado,Detalle\n';

    campaignData.queue.forEach(lead => {
        const name = (lead.name || '').replace(/"/g, '""');
        const phone = lead.phone || '';
        const status = lead.status || 'pending';
        const error = (lead.error || '').replace(/"/g, '""');
        
        csvContent += `"${name}","${phone}","${status}","${error}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    // Nombre de archivo con fecha y hora
    const date = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_envio_whatsapp_${date}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
