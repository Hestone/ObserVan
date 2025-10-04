/**
 * Google Gemini AI Chatbot Module for ObserveVan
 * Provides conversational AI for route safety and neighborhood analysis
 */

const GeminiAI = {
    conversationHistory: [],
    currentYear: '2024',
    currentCrimeType: 'all',
    
    /**
     * Check if Gemini API key is configured
     */
    isConfigured() {
        return CONFIG.GEMINI_API_KEY && CONFIG.GEMINI_API_KEY !== 'YOUR_GEMINI_API_KEY_HERE';
    },
    
    /**
     * Update context with current filters
     */
    updateContext(year, crimeType) {
        this.currentYear = year;
        this.currentCrimeType = crimeType;
    },

    /**
     * Send a chat message and get response
     */
    async sendMessage(userMessage) {
        if (!this.isConfigured()) {
            return {
                success: false,
                message: 'Please configure your Google Gemini API key in config.js. Get your free API key at: https://makersuite.google.com/app/apikey'
            };
        }

        try {
            // Build context with crime data
            const context = this.buildContext(userMessage);
            
            // Create prompt with conversation history
            const prompt = this.createChatPrompt(userMessage, context);
            
            // Call Gemini API
            const response = await this.callGeminiAPI(prompt);
            
            // Add to conversation history
            this.conversationHistory.push({
                role: 'user',
                content: userMessage
            });
            this.conversationHistory.push({
                role: 'assistant',
                content: response
            });
            
            // Keep history manageable (last 10 exchanges)
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }
            
            return {
                success: true,
                message: response
            };
        } catch (error) {
            console.error('Gemini API Error:', error);
            return {
                success: false,
                message: `Failed to get response: ${error.message}`
            };
        }
    },

    /**
     * Build context from crime data relevant to the query
     */
    buildContext(userMessage) {
        const context = {
            year: this.currentYear,
            crimeType: this.currentCrimeType
        };
        
        // Get city-wide stats
        const stats = CrimeData.getCityStats(this.currentYear, this.currentCrimeType);
        context.cityStats = stats;
        
        // Check if specific neighborhoods are mentioned
        const mentionedNeighborhoods = [];
        for (const name in CrimeData.neighborhoods) {
            if (userMessage.toLowerCase().includes(name.toLowerCase())) {
                const data = CrimeData.getNeighborhoodData(name, this.currentYear, this.currentCrimeType);
                const neighborhood = CrimeData.neighborhoods[name];
                mentionedNeighborhoods.push({
                    ...data,
                    coordinates: neighborhood.coordinates,
                    threatLevel: HeatmapRenderer.getThreatLevelLabel(data.incidents)
                });
            }
        }
        context.mentionedNeighborhoods = mentionedNeighborhoods;
        
        // Get all neighborhoods sorted by safety (for route analysis)
        const allNeighborhoods = CrimeData.getAllNeighborhoods(this.currentYear, this.currentCrimeType)
            .map(n => {
                const neighborhood = CrimeData.neighborhoods[n.name];
                return {
                    ...n,
                    coordinates: neighborhood.coordinates,
                    threatLevel: HeatmapRenderer.getThreatLevelLabel(n.incidents)
                };
            })
            .sort((a, b) => a.incidents - b.incidents);
        
        context.safestAreas = allNeighborhoods.slice(0, 5);
        context.highestCrimeAreas = allNeighborhoods.slice(-5).reverse();
        
        return context;
    },

    /**
     * Create chat prompt with context
     */
    createChatPrompt(userMessage, context) {
        const crimeTypeLabel = context.crimeType === 'all' ? 'all crime types' : context.crimeType;
        
        let prompt = `You are a helpful Vancouver safety assistant with access to real crime data. You help people understand neighborhood safety and plan safe routes in Vancouver.

Current Context:
- Year: ${context.year}
- Crime Focus: ${crimeTypeLabel}
- City Total Incidents: ${context.cityStats.total}
- City Average: ${context.cityStats.average} per neighborhood

Safest Neighborhoods (${context.year}):
${context.safestAreas.map((n, i) => `${i + 1}. ${n.name}: ${n.incidents} incidents (${n.threatLevel})`).join('\n')}

Highest Crime Neighborhoods (${context.year}):
${context.highestCrimeAreas.map((n, i) => `${i + 1}. ${n.name}: ${n.incidents} incidents (${n.threatLevel})`).join('\n')}
`;

        if (context.mentionedNeighborhoods.length > 0) {
            prompt += `\n\nNeighborhoods mentioned in user query:
${context.mentionedNeighborhoods.map(n => `- ${n.name}: ${n.incidents} incidents (${n.threatLevel}), Location: [${n.coordinates[0].toFixed(4)}, ${n.coordinates[1].toFixed(4)}]`).join('\n')}`;
        }

        // Add conversation history if exists
        if (this.conversationHistory.length > 0) {
            prompt += `\n\nRecent Conversation:\n`;
            this.conversationHistory.slice(-6).forEach(entry => {
                prompt += `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.content}\n`;
            });
        }

        prompt += `\n\nUser Question: ${userMessage}

Guidelines for your response:
1. For safety questions: Provide specific information about the neighborhood(s) asked about, including crime statistics and threat level
2. For route questions: Suggest routes that pass through safer neighborhoods, mentioning specific areas to prefer or avoid
3. For "is it safe" questions: Give a balanced answer based on the data, including time-of-day considerations if relevant
4. Be concise (under 200 words) but informative
5. Always reference the actual data (incident counts, threat levels)
6. If asked about specific times (night/day), mention that data doesn't distinguish but provide general safety advice
7. Suggest specific alternative routes when relevant, naming actual neighborhoods

Response:`;

        return prompt;
    },

    /**
     * Call Google Gemini API
     */
    async callGeminiAPI(prompt) {
        const url = `${CONFIG.GEMINI_API_URL}?key=${CONFIG.GEMINI_API_KEY}`;
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            }
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API request failed');
        }

        const data = await response.json();
        
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Invalid response format from Gemini API');
        }

        return data.candidates[0].content.parts[0].text;
    },

    /**
     * Reset conversation history
     */
    resetConversation() {
        this.conversationHistory = [];
    },

    /**
     * Generate one-time analysis (for analyze button)
     */
    async generateAnalysis(year, crimeType) {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'Please configure your Google Gemini API key in config.js. Get your free API key at: https://makersuite.google.com/app/apikey'
            };
        }

        try {
            const neighborhoods = CrimeData.getAllNeighborhoods(year, crimeType);
            const stats = CrimeData.getCityStats(year, crimeType);
            
            neighborhoods.sort((a, b) => b.incidents - a.incidents);
            const topAreas = neighborhoods.slice(0, 5);
            const bottomAreas = neighborhoods.slice(-5).reverse();
            
            const prompt = this.createAnalysisPrompt(year, crimeType, stats, topAreas, bottomAreas);
            const response = await this.callGeminiAPI(prompt);
            
            return {
                success: true,
                analysis: response
            };
        } catch (error) {
            console.error('Gemini API Error:', error);
            return {
                success: false,
                error: `Failed to generate analysis: ${error.message}`
            };
        }
    },

    /**
     * Create analysis prompt for one-time analysis
     */
    createAnalysisPrompt(year, crimeType, stats, topAreas, bottomAreas) {
        const crimeTypeLabel = crimeType === 'all' ? 'all crime types' : crimeType;
        
        return `You are a crime data analyst for Vancouver, Canada. Analyze the following crime statistics for ${year} focusing on ${crimeTypeLabel}.

City-wide Statistics:
- Total Incidents: ${stats.total}
- Average per Neighborhood: ${stats.average}
- Highest Count: ${stats.max}
- Lowest Count: ${stats.min}
- Number of Neighborhoods: ${stats.neighborhoods}

Top 5 Highest Crime Areas:
${topAreas.map((area, i) => `${i + 1}. ${area.name}: ${area.incidents} incidents`).join('\n')}

Top 5 Lowest Crime Areas:
${bottomAreas.map((area, i) => `${i + 1}. ${area.name}: ${area.incidents} incidents`).join('\n')}

Please provide:
1. A brief overview of the crime situation in Vancouver for ${year}
2. Analysis of the patterns you observe (why certain areas might have higher/lower crime)
3. Key insights about the safest and most challenging neighborhoods
4. General safety recommendations for residents and visitors

Keep the analysis concise, informative, and under 250 words. Focus on actionable insights.`;
    },

    /**
     * Display analysis in UI (for analyze button)
     */
    displayAnalysis(analysisResult) {
        // This function is kept for compatibility but not used in chatbot
        const chatMessages = document.getElementById('chat-messages');
        const assistantMessage = document.createElement('div');
        assistantMessage.className = 'chat-message assistant';
        
        if (analysisResult.success) {
            assistantMessage.innerHTML = `
                <div class="message-content">
                    ${this.formatMessage(analysisResult.analysis)}
                </div>
            `;
        } else {
            assistantMessage.innerHTML = `
                <div class="message-content">
                    <p style="color: #e74c3c;">
                        <strong>⚠️ Error:</strong> ${analysisResult.error}
                    </p>
                </div>
            `;
        }
        
        chatMessages.appendChild(assistantMessage);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    },

    /**
     * Format message with proper HTML structure
     */
    formatMessage(text) {
        const paragraphs = text.split('\n\n').filter(p => p.trim());
        
        return paragraphs.map(para => {
            if (/^\d+\./.test(para.trim()) || /^-/.test(para.trim())) {
                return `<p><strong>${para}</strong></p>`;
            }
            return `<p>${para}</p>`;
        }).join('');
    }
};
