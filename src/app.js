/**
 * Main Application Module for ObserveVan
 * Handles initialization, event listeners, and chatbot interactions
 */

const ObserveVanApp = {
    currentYear: CONFIG.DEFAULT_YEAR,
    currentCrimeType: CONFIG.DEFAULT_CRIME_TYPE,
    currentLocation: 'all',

    /**
     * Initialize the application
     */
    async init() {
        console.log(`${CONFIG.APP_NAME} v${CONFIG.APP_VERSION} - Initializing...`);
        
        // Detect if a backend server with endpoints is available
        this.serverMode = false;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 2000);
            const res = await fetch('/date_meta', { signal: controller.signal });
            clearTimeout(timeout);
            if (res.ok) {
                this.serverMode = true;
                this.serverMeta = await res.json();
                console.log('Server mode enabled — backend endpoints detected');
            }
        } catch (e) {
            console.log('No backend endpoints detected, using local CSV/sample data');
        }

        // If server mode, we don't need to parse large CSVs locally
        if (!this.serverMode) {
            // Load all data first (local CSVs)
            await CrimeData.init();
        }

        // Set up event listeners
        this.setupEventListeners();
        
        // Populate location and type filters (server-driven when available)
        if (this.serverMode && this.serverMeta) {
            // server provided metadata may include supported years; we currently don't render a separate year selector
            // but the information could be used for validation or future UX.

            // Populate crime types from server if endpoint exists
            try {
                const typesRes = await fetch('/types');
                if (typesRes.ok) {
                    const types = await typesRes.json();
                    const crimeTypeSelect = document.getElementById('crime-type-select');
                    // Do NOT include a visible "All Crime Types" option. Leave no-selection to mean 'all'.
                    crimeTypeSelect.innerHTML = '';
                    types.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t;
                        opt.textContent = t;
                        crimeTypeSelect.appendChild(opt);
                    });
                    // If Choices.js is active, try to refresh its choices to reflect server-provided types
                    try {
                        if (window.__choices_crime_type && typeof window.__choices_crime_type.setChoices === 'function') {
                            const choices = types.map(v => ({ value: v, label: v }));
                            window.__choices_crime_type.setChoices(choices, 'value', 'label', true);
                        }
                    } catch (e) {
                        console.warn('Failed to update Choices.js with server types', e);
                    }
                }
            } catch (e) {
                console.warn('Failed to populate types from server', e);
            }

            // Populate neighbourhood list from server
            try {
                const nRes = await fetch('/neighbourhoods');
                if (nRes.ok) {
                    const list = await nRes.json();
                    const locationSelect = document.getElementById('location-select');
                    // keep All Vancouver option
                    locationSelect.innerHTML = '<option value="all">All Vancouver</option>';
                    list.forEach(n => {
                        const opt = document.createElement('option');
                        opt.value = n.neighbourhood || n.name || n.name;
                        opt.textContent = n.neighbourhood || n.name || n.name;
                        locationSelect.appendChild(opt);
                    });
                }
            } catch (e) {
                console.warn('Failed to populate neighbourhoods from server', e);
            }
        } else {
            // Populate location filter from local coordinates
            this.populateLocationFilter();
            // Populate crime type filter from loaded local data
            this.populateCrimeTypeFilterFromData();
        }
        
        // Initial render
        this.updateVisualization();
        
        // Update Gemini context
        GeminiAI.updateContext(this.currentYear, this.currentCrimeType, this.currentLocation);
        
        console.log('Application initialized successfully');
    },

    /**
     * Set up event listeners for user interactions
     */
    setupEventListeners() {
        // Location selector
        const locationSelect = document.getElementById('location-select');
        locationSelect.addEventListener('change', (e) => {
            this.currentLocation = e.target.value;
            this.updateVisualization();
            GeminiAI.updateContext(this.currentYear, this.currentCrimeType, this.currentLocation);
        });

        // No separate year selector anymore; the calendar controls define the date range.
        // Initialize currentYear from config (fallback) — may be overwritten from start_date below.
        this.currentYear = this.currentYear || CONFIG.DEFAULT_YEAR;

        // Date range inputs (new calendar pickers)
        const startDateInput = document.getElementById('start_date');
        const endDateInput = document.getElementById('end_date');

        // Helper to set sensible defaults when application initializes
        const setDefaultDatesForYear = (year) => {
            // default to full calendar year
            const start = `${year}-01-01`;
            const end = `${year}-12-31`;
            if (startDateInput && !startDateInput.value) startDateInput.value = start;
            if (endDateInput && !endDateInput.value) endDateInput.value = end;
        };

        // initialize defaults based on current year
        setDefaultDatesForYear(this.currentYear);

        // When either date changes, re-render visualization. Keep currentYear in sync with start date's year
        const onDateRangeChange = () => {
            // If start date exists, update currentYear to its year part for compatibility
            if (startDateInput && startDateInput.value) {
                const y = new Date(startDateInput.value).getFullYear();
                this.currentYear = String(y);
            }

            // For now the visualization layer only accepts a single year; keep behavior consistent
            this.updateVisualization();
            GeminiAI.updateContext(this.currentYear, this.currentCrimeType, this.currentLocation);
        };

        if (startDateInput) startDateInput.addEventListener('change', onDateRangeChange);
        if (endDateInput) endDateInput.addEventListener('change', onDateRangeChange);

        // Crime type selector
        const crimeTypeSelect = document.getElementById('crime-type-select');
        // Helper to read the crime type selection and return a single value for the renderer.
        // If no option is selected, return 'all' (meaning: include all types).
        this.getSelectedCrimeType = () => {
            const sel = document.getElementById('crime-type-select');
            if (!sel) return 'all';
            const selected = Array.from(sel.selectedOptions || []).map(o => o.value).filter(Boolean);
            if (selected.length === 0) return 'all';
            if (selected.includes('all')) return 'all';
            // If multiple types selected, we default to the first for compatibility with single-year renderer
            return selected[0];
        };

        // Set initial crime type
        this.currentCrimeType = this.getSelectedCrimeType();

        if (crimeTypeSelect) crimeTypeSelect.addEventListener('change', (e) => {
            this.currentCrimeType = this.getSelectedCrimeType();
            this.updateVisualization();
            GeminiAI.updateContext(this.currentYear, this.currentCrimeType, this.currentLocation);
        });

        // AI Analysis button (quick analysis)
        const analyzeBtn = document.getElementById('analyze-btn');
        analyzeBtn.addEventListener('click', () => {
            this.generateQuickAnalysis();
        });

        // Chatbot toggle button
        const toggleChat = document.getElementById('toggle-chat');
        toggleChat.addEventListener('click', () => {
            this.toggleChatbot();
        });

        // Chat send button
        const sendBtn = document.getElementById('send-message');
        sendBtn.addEventListener('click', () => {
            this.sendChatMessage();
        });

        // Chat input - send on Enter (but Shift+Enter for new line)
        const chatInput = document.getElementById('chat-input');
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendChatMessage();
            }
        });
    },

    /**
     * Update the visualization based on current selections
     */
    updateVisualization() {
        console.log(`Updating visualization for ${this.currentYear}, crime type: ${this.currentCrimeType}, location: ${this.currentLocation} (serverMode=${this.serverMode})`);
        if (this.serverMode) {
            HeatmapRenderer.renderServer(this.currentYear, this.currentCrimeType, this.currentLocation);
        } else {
            HeatmapRenderer.render(this.currentYear, this.currentCrimeType, this.currentLocation);
        }
    },

    /**
     * Toggle chatbot visibility
     */
    toggleChatbot() {
        const chatContainer = document.querySelector('.right-panel.chatbot-container');
        chatContainer.classList.toggle('minimized');
    },

    /**
     * Send a chat message
     */
    async sendChatMessage() {
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-message');
        const chatMessages = document.getElementById('chat-messages');
        
        const message = chatInput.value.trim();
        if (!message) return;
        
        // Add user message to chat
        this.addChatMessage('user', message);
        
        // Clear input
        chatInput.value = '';
        
        // Disable send button
        sendBtn.disabled = true;
        sendBtn.innerHTML = '<span class="loading-spinner"></span> Thinking...';
        
        // Add thinking indicator
        const thinkingId = this.addChatMessage('assistant', '💭 Analyzing data and preparing response...');
        
        try {
            // Send to Gemini
            const response = await GeminiAI.sendMessage(message);
            
            // Remove thinking indicator
            const thinkingMsg = document.getElementById(thinkingId);
            if (thinkingMsg) thinkingMsg.remove();
            
            // Add assistant response
            if (response.success) {
                this.addChatMessage('assistant', response.message);
            } else {
                this.addChatMessage('assistant', `⚠️ ${response.message}`);
            }
        } catch (error) {
            // Remove thinking indicator
            const thinkingMsg = document.getElementById(thinkingId);
            if (thinkingMsg) thinkingMsg.remove();
            
            console.error('Chat error:', error);
            this.addChatMessage('assistant', '❌ Sorry, I encountered an error. Please try again.');
        } finally {
            // Re-enable send button
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<span class="send-icon">➤</span> Send';
            
            // Focus back on input
            chatInput.focus();
        }
    },

    /**
     * Add a message to the chat
     */
    addChatMessage(role, content) {
        const chatMessages = document.getElementById('chat-messages');
        const messageDiv = document.createElement('div');
        const messageId = `msg-${Date.now()}`;
        
        messageDiv.id = messageId;
        messageDiv.className = `chat-message ${role}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                ${this.formatChatMessage(content)}
            </div>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        return messageId;
    },

    /**
     * Format chat message content
     */
    formatChatMessage(content) {
        // Convert line breaks to paragraphs
        const paragraphs = content.split('\n').filter(p => p.trim());
        
        return paragraphs.map(para => {
            // Check for list items
            if (para.trim().startsWith('- ') || para.trim().startsWith('• ')) {
                return `<p>${para}</p>`;
            }
            // Check for numbered lists
            if (/^\d+\./.test(para.trim())) {
                return `<p><strong>${para}</strong></p>`;
            }
            return `<p>${para}</p>`;
        }).join('');
    },

    /**
     * Populate location filter dropdown
     */
    populateLocationFilter() {
        const locationSelect = document.getElementById('location-select');
        const neighborhoods = Object.keys(CrimeData.neighborhoodCoordinates).sort();
        
        neighborhoods.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            locationSelect.appendChild(option);
        });
    },

    /**
     * Populate the crime-type select using categories present in CrimeData.
     * This works when running in local/offline mode (CSV parsed client-side).
     */
    populateCrimeTypeFilterFromData() {
        const select = document.getElementById('crime-type-select');
        if (!select) return;

        // Collect keys from the aggregated data (e.g., theft, break, vehicle, person, etc.)
        const types = new Set();
        for (const year in CrimeData.crimeDataByYear) {
            const yearData = CrimeData.crimeDataByYear[year] || {};
            for (const neigh in yearData) {
                const obj = yearData[neigh] || {};
                Object.keys(obj).forEach(k => types.add(k));
            }
        }

        // Convert to sorted array (exclude any 'all' key if present)
        const ordered = Array.from(types).filter(t => t && t !== 'all').sort();

        // Map to human-friendly labels (basic mapping)
        const niceLabel = (key) => {
            if (key === 'all') return 'All Crime Types';
            if (key === 'break') return 'Break and Enter';
            if (key === 'person') return 'Violence / Person';
            if (key === 'vehicle') return 'Vehicle-related';
            if (key === 'theft') return 'Theft';
            if (key === 'commercial') return 'Break & Enter (Commercial)';
            if (key === 'residential') return 'Break & Enter (Residential)';
            if (key === 'mischief') return 'Mischief';
            if (key === 'other') return 'Other';
            return key.charAt(0).toUpperCase() + key.slice(1);
        };


        // Build choices array (do NOT include a visible 'all' option)
        const choices = ordered.map(v => ({ value: v, label: niceLabel(v) }));

        // Replace select options (no 'all' option shown)
        select.innerHTML = '';
        choices.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.value;
            opt.textContent = c.label;
            select.appendChild(opt);
        });

        // If Choices.js was initialized, update it
        try {
            if (window.__choices_crime_type && typeof window.__choices_crime_type.setChoices === 'function') {
                // setChoices expects an array of objects
                window.__choices_crime_type.setChoices(choices, 'value', 'label', true);
            }
        } catch (e) {
            console.warn('Failed to update Choices.js for crime-type-select', e);
        }

        // Keep the current selection if present and ensure UI + app state are in sync.
        try {
            const desired = this.currentCrimeType || 'all';
            // If the currentCrimeType corresponds to a real option, preselect it. Otherwise, leave nothing selected
            Array.from(select.options).forEach(opt => {
                opt.selected = (opt.value === desired);
            });

            // If Choices.js is present, try to set its active choice(s) as well.
            try {
                if (window.__choices_crime_type && typeof window.__choices_crime_type.setChoiceByValue === 'function') {
                    // Only set if desired matches an actual option (Choices will ignore unknown values)
                    window.__choices_crime_type.setChoiceByValue(desired);
                } else if (window.__choices_crime_type && typeof window.__choices_crime_type.setValue === 'function') {
                    window.__choices_crime_type.setValue(true, [{ value: desired, label: desired }]);
                }
            } catch (innerErr) {
                // Not critical — continue
            }

            // If nothing is selected, we intentionally do NOT dispatch a change event here.
            // The app's logic treats an empty selection as 'all' (see getSelectedCrimeType()),
            // so leaving no selection visually hides the 'All Crime Types' option while preserving default behavior.
        } catch (e) {
            console.warn('Failed to set default crime-type selection', e);
        }
    },

    /**
     * Generate a quick analysis for the current view
     */
    async generateQuickAnalysis() {
        const analyzeBtn = document.getElementById('analyze-btn');
        const originalText = analyzeBtn.innerHTML;
        
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<span class="loading-spinner"></span> Analyzing...';
        
        const analysisResult = await GeminiAI.generateAnalysis(this.currentYear, this.currentCrimeType, this.currentLocation);
        
        // Display in chatbot
        GeminiAI.displayAnalysis(analysisResult);
        
        // Restore button
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = originalText;
    }
};

// Initialize the application after the DOM is fully loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM fully loaded and parsed');
    
    // Show loading overlay if it exists
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) loadingOverlay.style.display = 'flex';

    try {
        // Initialize the main application
        await ObserveVanApp.init();
    } catch (error) {
        console.error('Failed to initialize the application:', error);
        // Optionally, show an error message to the user in the UI
    } finally {
        // Hide loading overlay
        if (loadingOverlay) loadingOverlay.style.display = 'none';
    }
});
