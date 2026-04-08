// import dotenv from "dotenv";
// dotenv.config();
// // const apikey = process.env.API_KEY;
/**
 * Google Gemini AI Chatbot Module for ObserveVan
 * Provides conversational AI for route safety and neighborhood analysis
 */

const GeminiAI = {
    conversationHistory: [],
    currentYear: '2025',
    currentCrimeType: 'all',
    currentLocation: 'all',
    
    /**
     * Check if Gemini API key is configured
     */
    isConfigured() {
        return Boolean(CONFIG.GEMINI_API_KEY); //&& CONFIG.GEMINI_API_KEY !== apikey;
    },
    
    /**
     * Update context with current filters
     */
    updateContext(year, crimeType, location) {
        this.currentYear = year;
        this.currentCrimeType = crimeType;
        this.currentLocation = location;
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
            crimeType: this.currentCrimeType,
            location: this.currentLocation
        };
        
        // Get stats based on current location
        if (this.currentLocation === 'all') {
            const stats = CrimeData.getCityStats(this.currentYear, this.currentCrimeType);
            context.cityStats = stats;
        } else {
            const data = CrimeData.getNeighborhoodData(this.currentLocation, this.currentYear, this.currentCrimeType);
            context.neighborhoodStats = {
                ...data,
                threatLevel: HeatmapRenderer.getThreatLevelLabel(data.incidents),
                topHours: data.topHours || [],
                hourCounts: data.hourCounts || {},
                peakTimeOfDay: data.peakTimeOfDay || 'N/A'
            };
        }
        
        // Check if other neighborhoods are mentioned
        const mentionedNeighborhoods = [];
        for (const name in CrimeData.neighborhoodCoordinates) {
            if (userMessage.toLowerCase().includes(name.toLowerCase())) {
                const data = CrimeData.getNeighborhoodData(name, this.currentYear, this.currentCrimeType);
                mentionedNeighborhoods.push({
                    ...data,
                    coordinates: CrimeData.neighborhoodCoordinates[name],
                    threatLevel: HeatmapRenderer.getThreatLevelLabel(data.incidents)
                });
            }
        }
        context.mentionedNeighborhoods = mentionedNeighborhoods;
        
        // Get all neighborhoods sorted by safety (for route analysis)
        const allNeighborhoods = Object.keys(CrimeData.neighborhoodCoordinates)
            .map(name => CrimeData.getNeighborhoodData(name, this.currentYear, this.currentCrimeType))
            .map(n => {
                return {
                    ...n,
                    coordinates: CrimeData.neighborhoodCoordinates[n.name],
                    threatLevel: HeatmapRenderer.getThreatLevelLabel(n.incidents)
                };
            })
            .sort((a, b) => a.incidents - b.incidents);
        
        context.safestAreas = allNeighborhoods.slice(0, 5);
        context.highestCrimeAreas = allNeighborhoods.slice(-5).reverse();
        
        return context;
    },

    /**
     * Create a prompt for generating a quick analysis
     */
    createAnalysisPrompt(context) {
        let prompt = `Analyze the following crime data for ${context.location} in ${context.year} for crime type "${context.crimeType}". Provide a comprehensive summary.`;

        if (context.location === 'all') {
            prompt += `\n\nCity-wide stats: ${context.cityStats.total.toLocaleString()} incidents.`;
            prompt += `\n\nTop 5 neighborhoods by incidents:`;
            context.topNeighborhoods.forEach((n, i) => {
                prompt += `\n${i + 1}. ${n.name}: ${n.incidents.toLocaleString()} incidents`;
            });
            prompt += `\n\nProvide insights into the overall crime landscape in Vancouver.`;
        } else {
            prompt += `\n\nNeighborhood: ${context.neighborhoodStats.name}`;
            prompt += `\nIncidents: ${context.neighborhoodStats.incidents.toLocaleString()}`;
            prompt += `\nBreakdown: Theft (${context.neighborhoodStats.theft}), Break-in (${context.neighborhoodStats.break}), Vehicle-related (${context.neighborhoodStats.vehicle}), Person-related (${context.neighborhoodStats.person}).`;
            prompt += `\n\nProvide a detailed analysis of this neighborhood's safety profile.`;
        }
        
        return prompt;
    },

    /**
     * Create chat prompt with context
     */
    createChatPrompt(userMessage, context) {
        const crimeTypeLabel = context.crimeType === 'all' ? 'all crime types' : context.crimeType;
        
        let prompt = `You are ObserveVan AI, a helpful assistant for analyzing crime data in Vancouver.
Your primary goal is to answer user questions about crime and safety using the provided data.

**SYSTEM DATA**
- Current Year: ${context.year}
- Current Crime Filter: ${crimeTypeLabel}
- Current Location Focus: ${context.location}

**LOCATION-SPECIFIC DATA**
`;

        if (context.location === 'all') {
            prompt += `- City-wide Incidents: ${context.cityStats.total.toLocaleString()}\n`;
        } else {
            prompt += `- Neighborhood: ${context.neighborhoodStats.name}\n`;
            prompt += `- Incidents: ${context.neighborhoodStats.incidents.toLocaleString()}\n`;
            prompt += `- Threat Level: ${context.neighborhoodStats.threatLevel}\n`;
            prompt += `- Peak Crime Time: ${context.neighborhoodStats.peakTimeOfDay}\n`;
            // Add time summary when available
            if (context.neighborhoodStats.topHours && context.neighborhoodStats.topHours.length) {
                const top = context.neighborhoodStats.topHours.map(h=> `${h.hour}:00 (${h.count} incidents)`).join(', ');
                prompt += `- Top 3 Peak Hours: ${top}\n`;
            }
        }
        
        if (context.mentionedNeighborhoods.length > 0) {
            prompt += "\n**ADDITIONAL MENTIONED NEIGHBORHOODS DATA**\n";
            context.mentionedNeighborhoods.forEach(n => {
                prompt += `- ${n.name}: ${n.incidents} incidents, Threat: ${n.threatLevel}.`;
                if (n.topHours && n.topHours.length > 0) {
                    const top = n.topHours.map(h=> `${h.hour}:00 (${h.count})`).join(', ');
                    prompt += ` Peak Hours: ${top}.\n`;
                } else {
                    prompt += ` No specific peak hour data available.\n`;
                }
            });
        }

        // Add conversation history if exists
        if (this.conversationHistory.length > 0) {
            prompt += `\n**RECENT CONVERSATION HISTORY**\n`;
            this.conversationHistory.slice(-6).forEach(entry => {
                prompt += `${entry.role === 'user' ? 'User' : 'Assistant'}: ${entry.content}\n`;
            });
        }

        prompt += `\n**USER QUESTION**\n${userMessage}\n`;

        prompt += `\n**RESPONSE GUIDELINES**
1. For safety questions, use the provided incident counts and threat levels.
2. For route questions, suggest safer routes by naming specific neighborhoods to prefer or avoid.
3. For "is it safe" questions, give a balanced answer based on the data.
4. **Crucially, if asked about specific times (e.g., "at night", "in the morning"), you MUST use the "Peak Crime Hours" data to give a specific, data-driven answer. If that data is not available for a location, say so and provide general safety advice.**
5. Be concise (under 200 words) but informative.
6. Always reference the provided data in your answer.

**ASSISTANT RESPONSE**
`;

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
     * Generate a comprehensive analysis for the current view
     */
    async generateAnalysis(year, crimeType, location) {
        if (!this.isConfigured()) {
            return {
                success: false,
                error: 'Please configure your Google Gemini API key in config.js.'
            };
        }
        
        try {
            // Build context
            const context = {
                year,
                crimeType,
                location
            };
            
            if (location === 'all') {
                context.cityStats = CrimeData.getCityStats(year, crimeType);
                context.topNeighborhoods = CrimeData.getTopNeighborhoods(year, crimeType, 5);
            } else {
                context.neighborhoodStats = CrimeData.getNeighborhoodData(location, year, crimeType);
            }
            
            // Create prompt
            const prompt = this.createAnalysisPrompt(context);
            
            // Call Gemini
            const analysis = await this.callGeminiAPI(prompt);
            
            return {
                success: true,
                analysis
            };
        } catch (error) {
            console.error('Gemini Analysis Error:', error);
            return {
                success: false,
                error: `Analysis failed: ${error.message}`
            };
        }
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
