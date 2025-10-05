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
            // populate years if provided
            const yearSelect = document.getElementById('year-select');
            if (this.serverMeta.years && yearSelect) {
                // clear and repopulate keeping UI structure
                // keep existing options but try to select default
                if (Array.isArray(this.serverMeta.years)) {
                    // optional: replace year options
                }
            }

            // Populate crime types from server if endpoint exists
            try {
                const typesRes = await fetch('/types');
                if (typesRes.ok) {
                    const types = await typesRes.json();
                    const crimeTypeSelect = document.getElementById('crime-type-select');
                    // keep "All Crime Types" option first
                    crimeTypeSelect.innerHTML = '<option value="all">All Crime Types</option>';
                    types.forEach(t => {
                        const opt = document.createElement('option');
                        opt.value = t;
                        opt.textContent = t;
                        crimeTypeSelect.appendChild(opt);
                    });
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

        // Year selector
        const yearSelect = document.getElementById('year-select');
        yearSelect.value = this.currentYear;
        yearSelect.addEventListener('change', (e) => {
            this.currentYear = e.target.value;
            this.updateVisualization();
            GeminiAI.updateContext(this.currentYear, this.currentCrimeType, this.currentLocation);
        });

        // Crime type selector
        const crimeTypeSelect = document.getElementById('crime-type-select');
        crimeTypeSelect.value = this.currentCrimeType;
        crimeTypeSelect.addEventListener('change', (e) => {
            this.currentCrimeType = e.target.value;
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
