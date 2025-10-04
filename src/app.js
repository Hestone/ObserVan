/**
 * Main Application Module for ObserveVan
 * Handles initialization, event listeners, and chatbot interactions
 */

const ObserveVanApp = {
    currentYear: CONFIG.DEFAULT_YEAR,
    currentCrimeType: CONFIG.DEFAULT_CRIME_TYPE,

    /**
     * Initialize the application
     */
    init() {
        console.log(`${CONFIG.APP_NAME} v${CONFIG.APP_VERSION} - Initializing...`);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Initial render
        this.updateVisualization();
        
        // Update Gemini context
        GeminiAI.updateContext(this.currentYear, this.currentCrimeType);
        
        console.log('Application initialized successfully');
    },

    /**
     * Set up event listeners for user interactions
     */
    setupEventListeners() {
        // Year selector
        const yearSelect = document.getElementById('year-select');
        yearSelect.value = this.currentYear;
        yearSelect.addEventListener('change', (e) => {
            this.currentYear = e.target.value;
            this.updateVisualization();
            GeminiAI.updateContext(this.currentYear, this.currentCrimeType);
        });

        // Crime type selector
        const crimeTypeSelect = document.getElementById('crime-type-select');
        crimeTypeSelect.value = this.currentCrimeType;
        crimeTypeSelect.addEventListener('change', (e) => {
            this.currentCrimeType = e.target.value;
            this.updateVisualization();
            GeminiAI.updateContext(this.currentYear, this.currentCrimeType);
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
        console.log(`Updating visualization for ${this.currentYear}, crime type: ${this.currentCrimeType}`);
        HeatmapRenderer.render(this.currentYear, this.currentCrimeType);
    },

    /**
     * Toggle chatbot visibility
     */
    toggleChatbot() {
        const chatContainer = document.querySelector('.chatbot-container');
        const toggleBtn = document.getElementById('toggle-chat');
        
        chatContainer.classList.toggle('minimized');
        toggleBtn.textContent = chatContainer.classList.contains('minimized') ? '+' : '−';
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
     * Generate quick AI analysis (for analyze button)
     */
    async generateQuickAnalysis() {
        const analyzeBtn = document.getElementById('analyze-btn');
        const originalText = analyzeBtn.innerHTML;
        
        // Show loading state
        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '🤖 Analyzing<span class="loading-spinner"></span>';
        
        // Expand chatbot if minimized
        const chatContainer = document.querySelector('.chatbot-container');
        const toggleBtn = document.getElementById('toggle-chat');
        if (chatContainer.classList.contains('minimized')) {
            chatContainer.classList.remove('minimized');
            toggleBtn.textContent = '−';
        }
        
        // Add message to chat
        this.addChatMessage('assistant', '📊 Generating comprehensive analysis of current crime data...');
        
        try {
            // Generate analysis
            const result = await GeminiAI.generateAnalysis(this.currentYear, this.currentCrimeType);
            
            // Display result in chat
            if (result.success) {
                this.addChatMessage('assistant', result.analysis);
            } else {
                this.addChatMessage('assistant', `⚠️ ${result.error}`);
            }
        } catch (error) {
            console.error('Error generating analysis:', error);
            this.addChatMessage('assistant', '❌ An unexpected error occurred. Please try again.');
        } finally {
            // Reset button state
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = originalText;
        }
    }
};

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ObserveVanApp.init();
    });
} else {
    ObserveVanApp.init();
}
