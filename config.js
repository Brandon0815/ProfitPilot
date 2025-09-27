// AI Configuration
const AI_CONFIG = {
    // Replace 'your_huggingface_api_key_here' with your actual Hugging Face API key
    // Get it from: https://huggingface.co/settings/tokens
    HUGGINGFACE_API_KEY: 'your_huggingface_api_key_here',
    
    // API endpoints
    ENDPOINTS: {
        TEXT_GENERATION: 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
        CLASSIFICATION: 'https://api-inference.huggingface.co/models/facebook/bart-large-mnli'
    },
    
    // Expense categories for AI classification
    EXPENSE_CATEGORIES: [
        'Marketing and Advertising',
        'Materials and Supplies',
        'Shipping and Fulfillment',
        'Platform Fees',
        'Other Business Expenses'
    ],
    
    // Business analysis prompts
    PROMPTS: {
        PERFORMANCE_ANALYSIS: `Analyze this business data and provide insights about performance trends, seasonal patterns, and key metrics. Be specific and actionable.`,
        
        OPTIMIZATION_TIPS: `Based on this business data, provide 3-5 specific recommendations to improve profit margins and reduce costs. Focus on actionable advice.`,
        
        FUTURE_PROJECTIONS: `Based on the historical data trends, predict the next 3 months of business performance. Include revenue projections and potential challenges.`
    }
};

// Validation function to check if API key is set
function validateAPIKey() {
    if (AI_CONFIG.HUGGINGFACE_API_KEY === 'your_huggingface_api_key_here') {
        console.warn('⚠️ Please set your Hugging Face API key in config.js');
        return false;
    }
    return true;
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AI_CONFIG;
}

