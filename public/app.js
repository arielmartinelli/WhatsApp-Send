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

// Elementos de la interfaz - Plantilla (Mapeado a Leads Evento)
const templateTextArea = document.getElementById('event-template-text-area');
const variableButtonsContainer = document.getElementById('event-variable-buttons');
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
const btnClearSentHistory = document.getElementById('btn-clear-sent-history');
const batchEnabledCheckbox = document.getElementById('batch-enabled');
const batchSizeInput = document.getElementById('batch-size');
const batchDelayInput = document.getElementById('batch-delay');
const batchSettingsFields = document.getElementById('batch-settings-fields');

// Elementos de la interfaz - Sincronización Automática API (Leads)
const leadsSyncWebAppUrl = document.getElementById('leads-sync-web-app-url');
const leadsSyncSecurityToken = document.getElementById('leads-sync-security-token');
const leadsSyncStartDate = document.getElementById('leads-sync-start-date');
const leadsSyncEndDate = document.getElementById('leads-sync-end-date');
const leadsSyncColorId = document.getElementById('leads-sync-color-id');
const btnSyncLeadsCampaign = document.getElementById('btn-sync-leads-campaign');

// Elementos de la interfaz - Gestor de Plantillas (Leads Evento)
const selectEventTemplate = document.getElementById('select-event-template');
const eventTemplateNameInput = document.getElementById('event-template-name-input');
const btnSaveEventTemplate = document.getElementById('btn-save-event-template');
const btnDeleteEventTemplate = document.getElementById('btn-delete-event-template');
const eventVariableButtons = document.getElementById('event-variable-buttons');
const eventTemplateTextArea = document.getElementById('event-template-text-area');
const btnLoadLeadsToConsole = document.getElementById('btn-load-leads-to-console');

// Datos en memoria en el Frontend
let parsedHeaders = [];
let parsedRows = []; // array de objetos con las celdas
let selectedPhoneCol = '';
let selectedNameCol = '';
let wwebjsStatus = 'DISCONNECTED';
let cooldownInterval = null;
let campaignData = {
    status: 'STOPPED',
    index: 0,
    total: 0,
    queue: []
};

// 1. Manejo de Pestañas (Tabs)
const tabTitles = {
    'tab-dashboard': { title: 'Conexión con WhatsApp', subtitle: 'Vincular tu cuenta de WhatsApp Business o Personal' },
    'tab-leads': { title: 'Generar Mensaje', subtitle: 'Importar leads de campaña, redactar plantilla y preparar envío' },
    'tab-console': { title: 'Consola de Control', subtitle: 'Supervisar y ejecutar la campaña de envío' },
    'tab-stats': { title: 'Reportes y Métricas', subtitle: 'Analizar el rendimiento de envíos e historial de mensajes' }
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

        // Si se cambia a la pestaña de reportes, refrescar estadísticas
        if (targetTab === 'tab-stats') {
            if (typeof refreshStatsDashboard === 'function') {
                refreshStatsDashboard();
            }
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

// Escuchar cambios en checkbox de lotes
if (batchEnabledCheckbox) {
    batchEnabledCheckbox.addEventListener('change', (e) => {
        if (e.target.checked) {
            batchSettingsFields.classList.remove('hidden');
        } else {
            batchSettingsFields.classList.add('hidden');
        }
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

        // Borrar fila
        const tdActions = document.createElement('td');
        const btnDel = document.createElement('button');
        btnDel.className = 'btn btn-danger btn-sm';
        btnDel.innerHTML = '<i class="fas fa-trash-alt"></i>';
        btnDel.onclick = () => {
            parsedRows.splice(idx, 1);
            renderLeadsPreviewTable();
            updatePreview();
        };
        tdActions.appendChild(btnDel);
        tr.appendChild(tdActions);

        leadsTableBody.appendChild(tr);
    });

    leadsCountText.textContent = `${parsedRows.length} leads cargados encontrados.`;
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

    // Traducir variables mapeadas para la vista previa
    let compiledTemplate = template;
    if (selectedNameCol) {
        compiledTemplate = compiledTemplate.replace(/{Nombre}/gi, `{${selectedNameCol}}`);
    }
    if (selectedPhoneCol) {
        compiledTemplate = compiledTemplate.replace(/{Telefono}/gi, `{${selectedPhoneCol}}`);
    }

    // Compilar el mensaje
    const compiled = compileTemplate(compiledTemplate, firstRow);
    // Convertir saltos de línea a HTML <br>
    chatPreviewText.innerHTML = compiled.replace(/\n/g, '<br>');
}

function compileTemplate(template, row) {
    if (!row) return template;
    let result = template;
    // Iterar por las llaves reales del objeto fila
    Object.keys(row).forEach(key => {
        const value = row[key] || '';
        // Reemplazo exacto
        let regex = new RegExp(`{${escapeRegExp(key)}}`, 'g');
        result = result.replace(regex, value);
        
        // Reemplazo insensible para variables comunes (nombre, telefono, pais, link, etc.)
        const cleanKey = key.toLowerCase().replace(/\s/g, '');
        if (['nombre', 'telefono', 'pais', 'link', 'fechalocal', 'horalocal', 'fechaoriginal(arg)', 'fechalocal(cliente)', 'horalocal(cliente)'].includes(cleanKey)) {
            let regexCI = new RegExp(`{${escapeRegExp(key)}}`, 'gi');
            result = result.replace(regexCI, value);
        }
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
    const isCampaignRunning = (campaignData.status === 'RUNNING' || campaignData.status === 'BATCH_WAIT');
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
            if (data.status === 'sent') {
                addToSentHistory(lead.phone, lead.text);
                recordMessageStat(lead.phone, lead.name, 'sent');
            } else if (data.status === 'failed') {
                recordMessageStat(lead.phone, lead.name, 'failed', data.error);
            }
        }
    }
});

socket.on('error-msg', (msg) => {
    alert(msg);
});

function updateConsoleUI() {
    // Limpiar intervalo de cooldown si existe
    if (cooldownInterval) {
        clearInterval(cooldownInterval);
        cooldownInterval = null;
    }

    // Actualizar Badge de Estado de Campaña
    campaignStateBadge.className = 'campaign-status-badge';
    if (campaignData.status === 'RUNNING') {
        campaignStateBadge.textContent = 'EJECUTÁNDOSE';
        campaignStateBadge.classList.add('status-running');
    } else if (campaignData.status === 'BATCH_WAIT') {
        campaignStateBadge.textContent = 'ESPERANDO LOTE';
        campaignStateBadge.classList.add('status-paused');
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
    
    if (campaignData.status === 'BATCH_WAIT' && campaignData.cooldownEndTime) {
        const updateCooldownTimer = () => {
            const now = Date.now();
            const totalMs = campaignData.cooldownEndTime - now;
            const totalSec = Math.max(0, Math.round(totalMs / 1000));
            
            if (totalSec <= 0) {
                campaignProgressNumbers.textContent = `${index} / ${total} enviados - Preparando siguiente lote...`;
                clearInterval(cooldownInterval);
                cooldownInterval = null;
            } else {
                const mins = Math.floor(totalSec / 60);
                const secs = totalSec % 60;
                const timeStr = `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
                campaignProgressNumbers.textContent = `${index} / ${total} enviados - Siguiente lote en ${timeStr}`;
            }
        };
        updateCooldownTimer();
        cooldownInterval = setInterval(updateCooldownTimer, 1000);
    } else {
        campaignProgressNumbers.textContent = `${index} / ${total} enviados`;
    }
    
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
        alert('Por favor redacta la plantilla de mensaje en la pestaña "Leads Evento" antes de iniciar.');
        // Cambiar a pestaña Leads Evento
        document.getElementById('btn-tab-leads').click();
        return;
    }

    if (!selectedPhoneCol) {
        alert('Debe mapear una columna de teléfono en la pestaña "Leads Evento".');
        document.getElementById('btn-tab-leads').click();
        return;
    }

    // Obtener configuración de lotes
    const batchEnabled = batchEnabledCheckbox ? batchEnabledCheckbox.checked : false;
    const batchSize = batchEnabled ? (parseInt(batchSizeInput.value) || 20) : 999999;
    const batchDelay = batchEnabled ? ((parseInt(batchDelayInput.value) || 5) * 60) : 0; // en segundos

    // Cargar historial para filtrar duplicados
    let history = [];
    try {
        history = JSON.parse(localStorage.getItem('sent_leads_history') || '[]');
    } catch (e) {
        history = [];
    }

    const filteredLeads = [];
    let duplicateCount = 0;

    parsedRows.forEach((row) => {
        const phone = row[selectedPhoneCol];
        const name = selectedNameCol ? row[selectedNameCol] : '';
        const compiledMsg = compileTemplate(template, row);
        const cleanPhone = phone ? phone.replace(/\D/g, '') : '';

        const isAlreadySent = history.some(h => h.phone === cleanPhone && h.text === compiledMsg);

        if (isAlreadySent) {
            duplicateCount++;
        } else {
            filteredLeads.push({
                id: filteredLeads.length + 1,
                name: name,
                phone: phone,
                text: compiledMsg
            });
        }
    });

    if (filteredLeads.length === 0) {
        alert('Todos los contactos de la lista ya recibieron exactamente este mismo mensaje anteriormente.');
        return;
    }

    if (duplicateCount > 0) {
        if (!confirm(`Se detectaron ${duplicateCount} contactos que ya recibieron este mismo mensaje. ¿Deseas omitirlos y enviar solo a los ${filteredLeads.length} nuevos?`)) {
            return;
        }
    }

    socket.emit('start-campaign', {
        leads: filteredLeads,
        delays: { min: minDelay, max: maxDelay },
        batchSize: batchSize,
        batchDelay: batchDelay
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

// Historial de Envíos y Safeguards
function addToSentHistory(phone, text) {
    if (!phone) return;
    let history = [];
    try {
        history = JSON.parse(localStorage.getItem('sent_leads_history') || '[]');
    } catch (e) {
        history = [];
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const record = {
        phone: cleanPhone,
        text: text,
        timestamp: Date.now()
    };
    const exists = history.some(h => h.phone === cleanPhone && h.text === text);
    if (!exists) {
        history.push(record);
        if (history.length > 2000) {
            history.shift(); // Evitar que el localStorage crezca indefinidamente
        }
        localStorage.setItem('sent_leads_history', JSON.stringify(history));
    }
}

// Botón de Limpiar Historial de Enviados
if (btnClearSentHistory) {
    btnClearSentHistory.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que deseas limpiar el historial de mensajes enviados? Esto permitirá volver a enviar mensajes a leads que ya habían sido procesados.')) {
            localStorage.removeItem('sent_leads_history');
            alert('Historial de envíos limpiado correctamente.');
        }
    });
}

// Inicializar configuraciones y plantillas al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    // Sincronización API - Cargar valores guardados (Leads Campaña)
    if (leadsSyncWebAppUrl) {
        leadsSyncWebAppUrl.value = localStorage.getItem('leads_sync_web_app_url') || '';
    }
    if (leadsSyncSecurityToken) {
        leadsSyncSecurityToken.value = localStorage.getItem('leads_sync_security_token') || '';
    }
    
    // Configurar fechas por defecto a "hoy"
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    
    if (leadsSyncStartDate) leadsSyncStartDate.value = todayStr;
    if (leadsSyncEndDate) leadsSyncEndDate.value = todayStr;

    // Configurar rango de fechas de reportes (últimos 30 días)
    const past30Days = new Date();
    past30Days.setDate(today.getDate() - 30);
    const pYyyy = past30Days.getFullYear();
    const pMm = String(past30Days.getMonth() + 1).padStart(2, '0');
    const pDd = String(past30Days.getDate()).padStart(2, '0');
    const past30DaysStr = `${pYyyy}-${pMm}-${pDd}`;

    const statsStartDate = document.getElementById('stats-start-date');
    const statsEndDate = document.getElementById('stats-end-date');
    if (statsStartDate) statsStartDate.value = past30DaysStr;
    if (statsEndDate) statsEndDate.value = todayStr;

    // Inicializar listeners del panel de estadísticas
    initStatsListeners();

    // Inicializar selectores de plantillas
    populateTemplateSelectors();
});

// Lógica de Sincronización Directa de Leads de Campaña desde Google Web App
if (btnSyncLeadsCampaign) {
    btnSyncLeadsCampaign.addEventListener('click', async () => {
        const url = leadsSyncWebAppUrl.value.trim();
        const token = leadsSyncSecurityToken.value.trim();
        const startDate = leadsSyncStartDate.value;
        const endDate = leadsSyncEndDate.value;
        const color = leadsSyncColorId.value;

        if (!url) {
            alert('Por favor introduce la URL de tu Apps Script Web App.');
            return;
        }

        if (!startDate || !endDate) {
            alert('Por favor selecciona las fechas de inicio y fin para la búsqueda.');
            return;
        }

        // Deshabilitar botón y mostrar carga
        btnSyncLeadsCampaign.disabled = true;
        const originalText = btnSyncLeadsCampaign.innerHTML;
        btnSyncLeadsCampaign.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sincronizando...';

        try {
            // Guardar configuración en localStorage
            localStorage.setItem('leads_sync_web_app_url', url);
            localStorage.setItem('leads_sync_security_token', token);

            // Construir URL con parámetros, especificando type=leads
            const queryUrl = `${url}?startDate=${startDate}&endDate=${endDate}&color=${color}&token=${encodeURIComponent(token)}&type=leads`;
            
            console.log(`Realizando petición de sincronización de campaña a: ${queryUrl}`);
            const response = await fetch(queryUrl, { redirect: 'follow' });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.error) {
                alert(`Error devuelto por Apps Script: ${data.error}`);
                return;
            }

            if (!Array.isArray(data) || data.length === 0) {
                alert('No se encontraron leads en el calendario para las fechas y color seleccionados.');
                return;
            }

            // Procesar los datos recibidos
            parsedHeaders = ["Nombre", "Telefono", "Pais", "Fecha Original (ARG)", "Fecha Local (Cliente)", "Hora Local (Cliente)", "Link"];
            
            parsedRows = data.map(item => {
                return {
                    "Nombre": item.nombre || item.Nombre || '',
                    "Telefono": item.telefono || item.Telefono || '',
                    "Pais": item.pais || item.Pais || '',
                    "Fecha Original (ARG)": item.fechaOriginal || item.fechaOriginalArg || item["Fecha Original (ARG)"] || '',
                    "Fecha Local (Cliente)": item.fechaLocal || item["Fecha Local (Cliente)"] || '',
                    "Hora Local (Cliente)": item.horaLocal || item["Hora Local (Cliente)"] || '',
                    "Link": item.link || item.Link || ''
                };
            });

            // Actualizar selectores en la interfaz de Leads
            populateColumnSelectors();

            // Auto-mapear
            selectedPhoneCol = 'Telefono';
            selectedNameCol = 'Nombre';
            selectPhoneCol.value = 'Telefono';
            selectNameCol.value = 'Nombre';

            // Mostrar tarjeta de previsualización y renderizar tabla
            cardLeadsPreview.classList.remove('hidden');
            renderLeadsPreviewTable();
            updateVariableButtons();
            updateConsoleButtonsState();
            
            // Auto-scroll
            cardLeadsPreview.scrollIntoView({ behavior: 'smooth' });

            alert(`Sincronización completada. Se importaron ${parsedRows.length} leads desde tu Calendario.`);
        } catch (error) {
            console.error('Error sincronizando calendario:', error);
            alert(`No se pudo realizar la sincronización. Verifica la URL de tu Web App y tu conexión de internet. Detalle: ${error.message}`);
        } finally {
            btnSyncLeadsCampaign.disabled = false;
            btnSyncLeadsCampaign.innerHTML = originalText;
        }
    });
}

// --- GESTIÓN DE PLANTILLAS PERSISTENTES ---
let savedTemplates = [];
try {
    savedTemplates = JSON.parse(localStorage.getItem('saved_message_templates') || '[]');
} catch (e) {
    savedTemplates = [];
}

// Si la lista de plantillas está vacía, agregar una por defecto
if (savedTemplates.length === 0) {
    savedTemplates.push({
        id: 'tpl-default-1',
        name: 'Confirmación General',
        text: 'Hola {Nombre}, confirmamos tu sesión para el {FechaLocal} a las {HoraLocal}. ¿Contamos con tu asistencia? Link del meet: {Link}'
    });
    localStorage.setItem('saved_message_templates', JSON.stringify(savedTemplates));
}

function populateTemplateSelectors() {
    if (!selectEventTemplate) return;

    // Limpiar dropdown
    selectEventTemplate.innerHTML = '<option value="">-- Seleccionar Plantilla Guardada --</option>';

    savedTemplates.forEach(tpl => {
        const opt1 = document.createElement('option');
        opt1.value = tpl.id;
        opt1.textContent = tpl.name;
        selectEventTemplate.appendChild(opt1);
    });
}

// Cargar plantilla cuando cambia el dropdown principal (Evento)
if (selectEventTemplate) {
    selectEventTemplate.addEventListener('change', () => {
        const tplId = selectEventTemplate.value;
        if (!tplId) return;

        const tpl = savedTemplates.find(t => t.id === tplId);
        if (tpl) {
            templateTextArea.value = tpl.text;
            eventTemplateNameInput.value = tpl.name;
            updatePreview();
        }
    });
}

// Guardar plantilla principal (Evento)
if (btnSaveEventTemplate) {
    btnSaveEventTemplate.addEventListener('click', () => {
        const name = eventTemplateNameInput.value.trim();
        const text = templateTextArea.value.trim();

        if (!name) {
            alert('Por favor introduce un nombre para la plantilla.');
            return;
        }
        if (!text) {
            alert('Por favor escribe el contenido del mensaje antes de guardar.');
            return;
        }

        saveOrUpdateTemplate(name, text, true);
    });
}

function saveOrUpdateTemplate(name, text, isEvent) {
    // Buscar si ya existe una plantilla con este nombre
    const existingIndex = savedTemplates.findIndex(t => t.name.toLowerCase() === name.toLowerCase());

    if (existingIndex !== -1) {
        if (confirm(`Ya existe una plantilla llamada "${name}". ¿Deseas sobrescribirla?`)) {
            savedTemplates[existingIndex].text = text;
            alert('Plantilla actualizada con éxito.');
        } else {
            return;
        }
    } else {
        const newTpl = {
            id: 'tpl-' + Date.now(),
            name: name,
            text: text
        };
        savedTemplates.push(newTpl);
        alert('Plantilla guardada con éxito.');
    }

    localStorage.setItem('saved_message_templates', JSON.stringify(savedTemplates));
    populateTemplateSelectors();

    // Seleccionar la plantilla guardada
    const updatedTpl = savedTemplates.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (updatedTpl) {
        if (selectEventTemplate) selectEventTemplate.value = updatedTpl.id;
    }
}

// Borrar plantilla principal (Evento)
if (btnDeleteEventTemplate) {
    btnDeleteEventTemplate.addEventListener('click', () => {
        const tplId = selectEventTemplate.value;
        if (!tplId) {
            alert('Por favor selecciona una plantilla guardada de la lista para eliminar.');
            return;
        }

        const tpl = savedTemplates.find(t => t.id === tplId);
        if (!tpl) return;

        if (confirm(`¿Estás seguro de que deseas eliminar la plantilla "${tpl.name}"?`)) {
            savedTemplates = savedTemplates.filter(t => t.id !== tplId);
            localStorage.setItem('saved_message_templates', JSON.stringify(savedTemplates));
            populateTemplateSelectors();
            
            // Limpiar campos
            eventTemplateNameInput.value = '';
            templateTextArea.value = '';
            if (selectEventTemplate) selectEventTemplate.value = '';
            updatePreview();
            
            alert('Plantilla eliminada correctamente.');
        }
    });
}

// Cargar Leads de Evento en la Consola
if (btnLoadLeadsToConsole) {
    btnLoadLeadsToConsole.addEventListener('click', () => {
        if (parsedRows.length === 0) {
            alert("No hay leads cargados para procesar.");
            return;
        }

        const template = templateTextArea.value.trim();
        if (!template) {
            alert("Por favor escribe la plantilla de mensaje.");
            return;
        }

        if (!confirm(`¿Deseas cargar estos ${parsedRows.length} leads de evento en la consola de envío?`)) {
            return;
        }

        // Traducimos las variables genéricas {Nombre} y {Telefono} al nombre de columna real mapeado
        let globalTemplate = template;
        if (selectedNameCol) {
            globalTemplate = globalTemplate.replace(/{Nombre}/gi, `{${selectedNameCol}}`);
        }
        if (selectedPhoneCol) {
            globalTemplate = globalTemplate.replace(/{Telefono}/gi, `{${selectedPhoneCol}}`);
        }

        // Armar campaña
        campaignData = {
            status: 'STOPPED',
            index: 0,
            total: parsedRows.length,
            queue: parsedRows.map((row, index) => {
                const phone = row[selectedPhoneCol];
                const name = selectedNameCol ? row[selectedNameCol] : 'Contacto';
                const compiledMsg = compileTemplate(globalTemplate, row);

                return {
                    id: index + 1,
                    name: name,
                    phone: phone,
                    status: 'pending',
                    text: compiledMsg
                };
            })
        };

        // Renderizar consola
        updateConsoleUI();
        updateConsoleButtonsState();

        // Mover a la pestaña de consola
        document.getElementById('btn-tab-console').click();

        alert(`¡Campaña cargada con éxito! ${parsedRows.length} mensajes personalizados listos en la Consola.`);
    });
}

// ==========================================
// 8. Lógica de Reportes y Estadísticas
// ==========================================

// Mapear el prefijo telefónico al país
function detectCountryFromPhone(phone) {
    if (!phone) return 'Otro / Internacional';
    const cleanPhone = phone.replace(/\D/g, ''); // Dejar solo dígitos

    if (cleanPhone.startsWith('34')) return 'España';
    if (cleanPhone.startsWith('54')) return 'Argentina';
    if (cleanPhone.startsWith('56')) return 'Chile';
    if (cleanPhone.startsWith('57')) return 'Colombia';
    if (cleanPhone.startsWith('52')) return 'México';
    if (cleanPhone.startsWith('598')) return 'Uruguay';
    if (cleanPhone.startsWith('593')) return 'Ecuador';
    if (cleanPhone.startsWith('51')) return 'Perú';
    if (cleanPhone.startsWith('58')) return 'Venezuela';
    if (cleanPhone.startsWith('55')) return 'Brasil';
    if (cleanPhone.startsWith('502')) return 'Guatemala';
    if (cleanPhone.startsWith('503')) return 'El Salvador';
    if (cleanPhone.startsWith('504')) return 'Honduras';
    if (cleanPhone.startsWith('505')) return 'Nicaragua';
    if (cleanPhone.startsWith('506')) return 'Costa Rica';
    if (cleanPhone.startsWith('507')) return 'Panamá';
    if (cleanPhone.startsWith('591')) return 'Bolivia';
    if (cleanPhone.startsWith('595')) return 'Paraguay';
    if (cleanPhone.startsWith('1')) return 'USA / Canadá';
    
    return 'Otro / Internacional';
}

// Registrar envío exitoso o fallido en el log histórico local
function recordMessageStat(phone, name, status, error = '') {
    let stats = [];
    try {
        stats = JSON.parse(localStorage.getItem('messages_stats_db') || '[]');
    } catch (e) {
        stats = [];
    }

    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    const country = detectCountryFromPhone(cleanPhone);

    const record = {
        timestamp: new Date().toISOString(),
        phone: cleanPhone,
        name: name || 'Contacto',
        status: status, // 'sent' | 'failed'
        error: error || '',
        country: country
    };

    stats.push(record);
    
    // Evitar almacenamiento excesivo (máximo 10,000 registros históricos)
    if (stats.length > 10000) {
        stats.shift();
    }
    
    localStorage.setItem('messages_stats_db', JSON.stringify(stats));
}

// Obtener o crear el elemento flotante de tooltip
function getOrCreateChartTooltip() {
    let tooltip = document.getElementById('chart-global-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'chart-global-tooltip';
        tooltip.className = 'chart-tooltip';
        document.body.appendChild(tooltip);
    }
    return tooltip;
}

// Dibujar gráfico de líneas de envíos diarios usando SVG puros
function drawSvgLineChart(container, data) {
    container.innerHTML = '';
    
    if (data.length === 1) {
        data = [{ label: '', count: 0 }, ...data];
    }

    const width = 500;
    const height = 200;
    const paddingLeft = 40;
    const paddingRight = 20;
    const paddingTop = 25;
    const paddingBottom = 30;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    // Obtener valor máximo para escalar
    const maxVal = Math.max(...data.map(d => d.count), 5);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('class', 'chart-svg');

    // Gradiente translúcido
    svg.innerHTML = `
        <defs>
            <linearGradient id="chart-gradient-violet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.35" />
                <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.00" />
            </linearGradient>
        </defs>
    `;

    // 1. Rejilla horizontal
    const gridDivisions = 4;
    for (let i = 0; i <= gridDivisions; i++) {
        const y = paddingTop + (chartHeight / gridDivisions) * i;
        const value = Math.round(maxVal - (maxVal / gridDivisions) * i);
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', paddingLeft);
        line.setAttribute('y1', y);
        line.setAttribute('x2', width - paddingRight);
        line.setAttribute('y2', y);
        line.setAttribute('class', 'chart-grid-line');
        svg.appendChild(line);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', paddingLeft - 10);
        text.setAttribute('y', y + 4);
        text.setAttribute('class', 'chart-axis-text');
        text.setAttribute('style', 'text-anchor: end;');
        text.textContent = value;
        svg.appendChild(text);
    }

    // 2. Calcular puntos
    const points = data.map((d, index) => {
        const x = paddingLeft + (chartWidth / (data.length - 1)) * index;
        const y = paddingTop + chartHeight - (d.count / maxVal) * chartHeight;
        return { x, y, label: d.label, count: d.count };
    });

    // 3. Área sombreada
    let areaPathD = `M ${points[0].x} ${paddingTop + chartHeight} `;
    points.forEach(p => {
        areaPathD += `L ${p.x} ${p.y} `;
    });
    areaPathD += `L ${points[points.length - 1].x} ${paddingTop + chartHeight} Z`;

    const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    areaPath.setAttribute('d', areaPathD);
    areaPath.setAttribute('class', 'chart-area');
    svg.appendChild(areaPath);

    // 4. Línea principal
    let linePathD = `M ${points[0].x} ${points[0].y} `;
    for (let i = 1; i < points.length; i++) {
        linePathD += `L ${points[i].x} ${points[i].y} `;
    }

    const linePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    linePath.setAttribute('d', linePathD);
    linePath.setAttribute('class', 'chart-line');
    svg.appendChild(linePath);

    // 5. Nodos e Interacción
    const tooltip = getOrCreateChartTooltip();

    points.forEach((p, idx) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', p.x);
        circle.setAttribute('cy', p.y);
        circle.setAttribute('class', 'chart-point');
        
        circle.addEventListener('mouseover', (e) => {
            tooltip.style.opacity = '1';
            tooltip.innerHTML = `<strong>${p.label}</strong><br/>Envíos: ${p.count}`;
            tooltip.style.left = `${e.pageX + 15}px`;
            tooltip.style.top = `${e.pageY - 15}px`;
        });
        circle.addEventListener('mousemove', (e) => {
            tooltip.style.left = `${e.pageX + 15}px`;
            tooltip.style.top = `${e.pageY - 15}px`;
        });
        circle.addEventListener('mouseout', () => {
            tooltip.style.opacity = '0';
        });

        svg.appendChild(circle);

        // Etiquetas del eje X
        if (data.length <= 10 || idx % Math.ceil(data.length / 7) === 0 || idx === data.length - 1) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', p.x);
            text.setAttribute('y', paddingTop + chartHeight + 18);
            text.setAttribute('class', 'chart-axis-text');
            text.setAttribute('style', 'text-anchor: middle;');
            text.textContent = p.label;
            svg.appendChild(text);
        }
    });

    container.appendChild(svg);
}

// Dibujar gráfico de barras de países usando SVG puros
function drawSvgBarChart(container, data) {
    container.innerHTML = '';

    const width = 500;
    const height = 200;
    const paddingLeft = 90;
    const paddingRight = 40;
    const paddingTop = 20;
    const paddingBottom = 20;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    const maxVal = Math.max(...data.map(d => d.count), 1);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.setAttribute('class', 'chart-svg');

    // Gradiente esmeralda
    svg.innerHTML = `
        <defs>
            <linearGradient id="chart-gradient-emerald" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#10b981" />
                <stop offset="100%" stop-color="#059669" />
            </linearGradient>
        </defs>
    `;

    const barCount = data.length;
    const barSpacing = chartHeight / Math.max(barCount, 5);
    const barHeight = 18;

    const tooltip = getOrCreateChartTooltip();

    data.forEach((d, index) => {
        const y = paddingTop + barSpacing * index + (barSpacing - barHeight) / 2;
        const barWidth = (d.count / maxVal) * chartWidth;

        // Nombre del país
        const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        labelText.setAttribute('x', paddingLeft - 12);
        labelText.setAttribute('y', y + barHeight / 2 + 4);
        labelText.setAttribute('class', 'chart-axis-text');
        labelText.setAttribute('style', 'text-anchor: end; font-weight: 500;');
        labelText.textContent = d.country;
        svg.appendChild(labelText);

        // Barra rectangular
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', paddingLeft);
        rect.setAttribute('y', y);
        rect.setAttribute('width', Math.max(barWidth, 4));
        rect.setAttribute('height', barHeight);
        rect.setAttribute('class', 'chart-bar');

        rect.addEventListener('mouseover', (e) => {
            tooltip.style.opacity = '1';
            tooltip.innerHTML = `<strong>${d.country}</strong><br/>Envíos: ${d.count}`;
            tooltip.style.left = `${e.pageX + 15}px`;
            tooltip.style.top = `${e.pageY - 15}px`;
        });
        rect.addEventListener('mousemove', (e) => {
            tooltip.style.left = `${e.pageX + 15}px`;
            tooltip.style.top = `${e.pageY - 15}px`;
        });
        rect.addEventListener('mouseout', () => {
            tooltip.style.opacity = '0';
        });

        svg.appendChild(rect);

        // Cantidad de envíos
        const valText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        valText.setAttribute('x', paddingLeft + barWidth + 8);
        valText.setAttribute('y', y + barHeight / 2 + 4);
        valText.setAttribute('class', 'chart-bar-value');
        valText.textContent = d.count;
        svg.appendChild(valText);
    });

    container.appendChild(svg);
}

// Renderizar la tabla de logs detallada en Reportes
function renderStatsTable(data) {
    const tbody = document.getElementById('stats-table-body');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">No hay registros de envíos que coincidan con los filtros.</td>
            </tr>
        `;
        return;
    }

    // Mostrar más recientes primero
    const reversedData = [...data].reverse();

    reversedData.forEach(row => {
        const tr = document.createElement('tr');

        const d = new Date(row.timestamp);
        const formattedDate = d.toLocaleString();

        const tdDate = document.createElement('td');
        tdDate.textContent = formattedDate;
        tr.appendChild(tdDate);

        const tdName = document.createElement('td');
        tdName.textContent = row.name;
        tr.appendChild(tdName);

        const tdPhone = document.createElement('td');
        tdPhone.textContent = row.phone;
        tr.appendChild(tdPhone);

        const tdCountry = document.createElement('td');
        tdCountry.textContent = row.country;
        tr.appendChild(tdCountry);

        const tdStatus = document.createElement('td');
        if (row.status === 'sent') {
            tdStatus.innerHTML = '<span class="badge badge-success"><i class="fas fa-check"></i> Éxito</span>';
        } else {
            tdStatus.innerHTML = '<span class="badge badge-danger"><i class="fas fa-times"></i> Falló</span>';
        }
        tr.appendChild(tdStatus);

        const tdError = document.createElement('td');
        if (row.status === 'sent') {
            tdError.innerHTML = '<span class="success-text">Mensaje enviado ✅</span>';
        } else {
            tdError.innerHTML = `<span class="text-danger" title="${row.error}">Error: ${row.error || 'Desconocido'} ❌</span>`;
        }
        tr.appendChild(tdError);

        tbody.appendChild(tr);
    });
}

// Procesar datos de logs y mandarlos a graficar
function renderStatsCharts(data) {
    const lineContainer = document.getElementById('line-chart-container');
    const barContainer = document.getElementById('bar-chart-container');
    
    if (!lineContainer || !barContainer) return;

    if (data.length === 0) {
        lineContainer.innerHTML = '<div class="text-muted text-center" style="margin: auto; padding: 20px;">Sin datos de envíos diarios.</div>';
        barContainer.innerHTML = '<div class="text-muted text-center" style="margin: auto; padding: 20px;">Sin datos por países.</div>';
        return;
    }

    // 1. Agrupar por día
    const dailyMap = {};
    data.forEach(item => {
        const dateStr = item.timestamp.slice(0, 10); // 'yyyy-MM-dd'
        dailyMap[dateStr] = (dailyMap[dateStr] || 0) + 1;
    });

    const sortedDates = Object.keys(dailyMap).sort();
    const dailyData = sortedDates.map(date => {
        const parts = date.split('-');
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const label = `${parts[2]} ${months[parseInt(parts[1]) - 1]}`;
        return { label, count: dailyMap[date] };
    });

    // 2. Agrupar por país
    const countryMap = {};
    data.forEach(item => {
        const country = item.country || 'Otro / Internacional';
        countryMap[country] = (countryMap[country] || 0) + 1;
    });

    const sortedCountries = Object.keys(countryMap)
        .map(country => ({ country, count: countryMap[country] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    drawSvgLineChart(lineContainer, dailyData);
    drawSvgBarChart(barContainer, sortedCountries);
}

// Recargar los KPI cards, tabla de logs y gráficos
function refreshStatsDashboard() {
    let stats = [];
    try {
        stats = JSON.parse(localStorage.getItem('messages_stats_db') || '[]');
    } catch (e) {
        stats = [];
    }

    // 1. Calcular KPIs globales (acumulado histórico total)
    const total = stats.length;
    const success = stats.filter(s => s.status === 'sent').length;
    const failed = stats.filter(s => s.status === 'failed').length;
    const deliveryRate = total > 0 ? Math.round((success / total) * 100) : 0;

    const totalEl = document.getElementById('stat-total-messages');
    const successEl = document.getElementById('stat-success-messages');
    const failedEl = document.getElementById('stat-failed-messages');
    const deliveryEl = document.getElementById('stat-delivery-rate');

    if (totalEl) totalEl.textContent = total;
    if (successEl) successEl.textContent = success;
    if (failedEl) failedEl.textContent = failed;
    if (deliveryEl) deliveryEl.textContent = `${deliveryRate}%`;

    // 2. Aplicar filtros dinámicos
    const searchVal = document.getElementById('stats-search')?.value.toLowerCase().trim() || '';
    const startDateVal = document.getElementById('stats-start-date')?.value || '';
    const endDateVal = document.getElementById('stats-end-date')?.value || '';

    let filteredStats = stats;

    if (searchVal) {
        filteredStats = filteredStats.filter(s => 
            (s.name && s.name.toLowerCase().includes(searchVal)) || 
            (s.phone && s.phone.includes(searchVal))
        );
    }
    if (startDateVal) {
        const startLimit = new Date(startDateVal + 'T00:00:00');
        filteredStats = filteredStats.filter(s => new Date(s.timestamp) >= startLimit);
    }
    if (endDateVal) {
        const endLimit = new Date(endDateVal + 'T23:59:59');
        filteredStats = filteredStats.filter(s => new Date(s.timestamp) <= endLimit);
    }

    // 3. Renderizar resumen
    const countSummary = document.getElementById('stats-count-summary');
    if (countSummary) {
        countSummary.textContent = `${filteredStats.length} registros coincidentes.`;
    }

    renderStatsTable(filteredStats);
    renderStatsCharts(filteredStats);
}

// Registrar event listeners de filtros y exportación
function initStatsListeners() {
    const statsSearch = document.getElementById('stats-search');
    const statsStartDate = document.getElementById('stats-start-date');
    const statsEndDate = document.getElementById('stats-end-date');
    const btnResetFilters = document.getElementById('btn-reset-filters');
    const btnClearStatsDb = document.getElementById('btn-clear-stats-db');
    const btnExportStatsCsv = document.getElementById('btn-export-stats-csv');

    if (statsSearch) {
        statsSearch.addEventListener('input', () => refreshStatsDashboard());
    }
    if (statsStartDate) {
        statsStartDate.addEventListener('change', () => refreshStatsDashboard());
    }
    if (statsEndDate) {
        statsEndDate.addEventListener('change', () => refreshStatsDashboard());
    }
    if (btnResetFilters) {
        btnResetFilters.addEventListener('click', () => {
            const today = new Date();
            const yyyy = today.getFullYear();
            const mm = String(today.getMonth() + 1).padStart(2, '0');
            const dd = String(today.getDate()).padStart(2, '0');
            const todayStr = `${yyyy}-${mm}-${dd}`;

            const past30Days = new Date();
            past30Days.setDate(today.getDate() - 30);
            const pYyyy = past30Days.getFullYear();
            const pMm = String(past30Days.getMonth() + 1).padStart(2, '0');
            const pDd = String(past30Days.getDate()).padStart(2, '0');
            const past30DaysStr = `${pYyyy}-${pMm}-${pDd}`;

            if (statsSearch) statsSearch.value = '';
            if (statsStartDate) statsStartDate.value = past30DaysStr;
            if (statsEndDate) statsEndDate.value = todayStr;
            refreshStatsDashboard();
        });
    }
    if (btnClearStatsDb) {
        btnClearStatsDb.addEventListener('click', () => {
            if (confirm('⚠️ ¿Estás completamente seguro de borrar TODO el historial de estadísticas de reportes? Esta acción no se puede deshacer.')) {
                localStorage.removeItem('messages_stats_db');
                refreshStatsDashboard();
                alert('Historial de estadísticas borrado correctamente.');
            }
        });
    }
    if (btnExportStatsCsv) {
        btnExportStatsCsv.addEventListener('click', () => {
            exportStatsToCsv();
        });
    }
}

// Exportar logs filtrados a CSV
function exportStatsToCsv() {
    let stats = [];
    try {
        stats = JSON.parse(localStorage.getItem('messages_stats_db') || '[]');
    } catch (e) {
        stats = [];
    }

    if (stats.length === 0) {
        alert('No hay registros de reportes para exportar.');
        return;
    }

    const searchVal = document.getElementById('stats-search')?.value.toLowerCase().trim() || '';
    const startDateVal = document.getElementById('stats-start-date')?.value || '';
    const endDateVal = document.getElementById('stats-end-date')?.value || '';

    let filteredStats = stats;
    if (searchVal) {
        filteredStats = filteredStats.filter(s => 
            (s.name && s.name.toLowerCase().includes(searchVal)) || 
            (s.phone && s.phone.includes(searchVal))
        );
    }
    if (startDateVal) {
        const startLimit = new Date(startDateVal + 'T00:00:00');
        filteredStats = filteredStats.filter(s => new Date(s.timestamp) >= startLimit);
    }
    if (endDateVal) {
        const endLimit = new Date(endDateVal + 'T23:59:59');
        filteredStats = filteredStats.filter(s => new Date(s.timestamp) <= endLimit);
    }

    let csvContent = '\uFEFF';
    csvContent += 'Fecha,Nombre,Telefono,Pais,Estado,Detalle\n';

    filteredStats.forEach(item => {
        const date = new Date(item.timestamp).toLocaleString().replace(/"/g, '""');
        const name = (item.name || '').replace(/"/g, '""');
        const phone = item.phone || '';
        const country = item.country || '';
        const status = item.status === 'sent' ? 'Exito' : 'Fallo';
        const error = (item.error || '').replace(/"/g, '""');

        csvContent += `"${date}","${name}","${phone}","${country}","${status}","${error}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_estadisticas_whatsapp_${dateStr}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
