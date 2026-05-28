/**
 * Main Application Module for ObserveVan
 */

const MONTHS = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
];

const ObserveVanApp = {
    currentYear:      CONFIG.DEFAULT_YEAR,
    currentCrimeType: CONFIG.DEFAULT_CRIME_TYPE,
    currentLocation:  'all',
    startYear:  2024,
    startMonth: 1,
    endYear:    2024,
    endMonth:   12,

    async init() {
        console.log(`${CONFIG.APP_NAME} v${CONFIG.APP_VERSION} - Initializing...`);

        this.serverMode = false;
        try {
            const ctrl = new AbortController();
            const t    = setTimeout(() => ctrl.abort(), 2000);
            const res  = await fetch('/date_meta', { signal: ctrl.signal });
            clearTimeout(t);
            if (res.ok) { this.serverMode = true; this.serverMeta = await res.json(); }
        } catch (e) {
            console.log('No backend detected — using local CSV/sample data');
        }

        if (!this.serverMode) await CrimeData.init();

        this._buildDateDropdowns();
        this._populateCrimeTypeFilter();
        this._populateLocationFilter();
        this.setupEventListeners();
        this.updateVisualization();
        GeminiAI.updateContext(this.currentYear, this.currentCrimeType, this.currentLocation);
        console.log('Application initialized successfully');
    },

    _buildDateDropdowns() {
        const years = [2020, 2021, 2022, 2023, 2024, 2025];
        const populate = (monthId, yearId, defaultYear, defaultMonth) => {
            const mSel = document.getElementById(monthId);
            const ySel = document.getElementById(yearId);
            if (!mSel || !ySel) return;
            mSel.innerHTML = MONTHS.map((name, i) =>
                `<option value="${i+1}" ${i+1 === defaultMonth ? 'selected' : ''}>${name}</option>`
            ).join('');
            ySel.innerHTML = years.map(y =>
                `<option value="${y}" ${y === defaultYear ? 'selected' : ''}>${y}</option>`
            ).join('');
        };
        populate('start_month', 'start_year', this.startYear, this.startMonth);
        populate('end_month',   'end_year',   this.endYear,   this.endMonth);
        const legacyWrap = document.getElementById('year-select-group');
        if (legacyWrap) legacyWrap.style.display = 'none';
    },

    _populateCrimeTypeFilter() {
        const sel = document.getElementById('crime-type-select');
        if (!sel) return;
        const types = CrimeData.getAllCrimeTypes ? CrimeData.getAllCrimeTypes() : [];
        sel.innerHTML = '<option value="all">All Crime Types</option>' +
            types.map(t => `<option value="${t}">${t}</option>`).join('');
        if (window.__choices_crime_type) {
            try { window.__choices_crime_type.destroy(); } catch(e) {}
        }
        if (window.Choices) {
            try {
                window.__choices_crime_type = new Choices(sel, {
                    removeItemButton: false,
                    shouldSort: false,
                    placeholder: true,
                    placeholderValue: 'Select crime type',
                    searchEnabled: types.length > 8,
                });
            } catch(e) { console.warn('Choices reinit failed', e); }
        }
    },

    _populateLocationFilter() {
        const sel = document.getElementById('location-select');
        if (!sel) return;
        sel.innerHTML = '<option value="all">All Vancouver</option>';
        Object.keys(CrimeData.neighborhoodCoordinates).sort().forEach(name => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = name;
            sel.appendChild(opt);
        });
    },

    setupEventListeners() {
        document.getElementById('location-select')
            ?.addEventListener('change', e => { this.currentLocation = e.target.value; });

        document.getElementById('crime-type-select')
            ?.addEventListener('change', e => { this.currentCrimeType = e.target.value || 'all'; });

        document.getElementById('apply-filters')
            ?.addEventListener('click', () => this._applyFilters());

        document.getElementById('reset-filters')
            ?.addEventListener('click', () => this._resetFilters());

        const analyzeBtn = document.getElementById('analyze-btn');
        if (analyzeBtn) {
            analyzeBtn.disabled = true;
            analyzeBtn.setAttribute('aria-disabled', 'true');
            analyzeBtn.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); });
        }

        document.getElementById('send-message')
            ?.addEventListener('click', () => this.sendChatMessage());

        document.getElementById('chat-input')
            ?.addEventListener('keydown', e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendChatMessage(); }
            });

        document.getElementById('toggle-chat')
            ?.addEventListener('click', () => this.toggleChatbot());
    },

    _applyFilters() {
        this.startYear  = parseInt(document.getElementById('start_year')?.value  || 2024, 10);
        this.startMonth = parseInt(document.getElementById('start_month')?.value || 1,    10);
        this.endYear    = parseInt(document.getElementById('end_year')?.value    || 2024, 10);
        this.endMonth   = parseInt(document.getElementById('end_month')?.value   || 12,   10);

        if (this.startYear * 12 + this.startMonth > this.endYear * 12 + this.endMonth) {
            this.endYear = this.startYear; this.endMonth = this.startMonth;
            const eSel = document.getElementById('end_year');
            const mSel = document.getElementById('end_month');
            if (eSel) eSel.value = this.endYear;
            if (mSel) mSel.value = this.endMonth;
        }

        this.currentCrimeType = document.getElementById('crime-type-select')?.value || 'all';
        this.currentLocation  = document.getElementById('location-select')?.value  || 'all';
        this.currentYear      = String(this.startYear);
        this.updateVisualization();
        GeminiAI.updateContext(this.currentYear, this.currentCrimeType, this.currentLocation);
    },

    _resetFilters() {
        this.startYear = 2024; this.startMonth = 1;
        this.endYear   = 2024; this.endMonth   = 12;
        this.currentYear = '2024'; this.currentCrimeType = 'all'; this.currentLocation = 'all';
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val; };
        set('start_year',2024); set('start_month',1); set('end_year',2024); set('end_month',12);
        set('location-select','all'); set('crime-type-select','all');
        if (window.__choices_crime_type) {
            try { window.__choices_crime_type.setChoiceByValue('all'); } catch(e) {}
        }
        this.updateVisualization();
        GeminiAI.updateContext(this.currentYear, this.currentCrimeType, this.currentLocation);
    },

    updateVisualization() {
        if (this.serverMode) {
            HeatmapRenderer.renderServer(this.currentYear, this.currentCrimeType, this.currentLocation);
        } else {
            HeatmapRenderer.render(
                this.currentYear, this.currentCrimeType, this.currentLocation,
                this.startYear, this.startMonth, this.endYear, this.endMonth
            );
        }
    },

    toggleChatbot() {
        document.querySelector('.right-panel.chatbot-container')?.classList.toggle('minimized');
    },

    async sendChatMessage() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn   = document.getElementById('send-message');
        const message   = chatInput.value.trim();
        if (!message) return;
        this.addChatMessage('user', message);
        chatInput.value = '';
        sendBtn.disabled = true;
        const thinkingId = this.addChatMessage('assistant', '💭 Analyzing data…');
        try {
            const response = await GeminiAI.sendMessage(message);
            document.getElementById(thinkingId)?.remove();
            this.addChatMessage('assistant', response.success ? response.message : `⚠️ ${response.message}`);
        } catch (err) {
            document.getElementById(thinkingId)?.remove();
            this.addChatMessage('assistant', '❌ Sorry, I encountered an error. Please try again.');
        } finally {
            sendBtn.disabled = false;
            chatInput.focus();
        }
    },

    addChatMessage(role, content) {
        const chatMessages = document.getElementById('chat-messages');
        const div = document.createElement('div');
        const id  = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        div.id = id; div.className = `chat-message ${role}`;
        div.innerHTML = `<div class="message-content">${content.split('\n').filter(p=>p.trim()).map(p=>`<p>${p}</p>`).join('')}</div>`;
        chatMessages.appendChild(div);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return id;
    },

    async generateQuickAnalysis() { /* AI disabled */ }
};

document.addEventListener('DOMContentLoaded', async () => {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex';
    try { await ObserveVanApp.init(); }
    catch (err) { console.error('Failed to initialize:', err); }
    finally { if (overlay) overlay.style.display = 'none'; }
});
