// ========================================
// CONFIGURACIÓN GLOBAL
// ========================================

const CONFIG = {
    // API
    API_URL: 'https://profe-ingles.onrender.com/chat',
    
    // Voice settings
    VOICE_LANG: 'en-GB',
    VOICE_RATE: 0.9,
    VOICE_PITCH: 1.0,
    
    // Recognition settings
    RECOGNITION_LANG: 'en-GB',
    RECOGNITION_CONTINUOUS: false,
    RECOGNITION_INTERIM: false,
    
    // Points system
    POINTS: {
        beginner: 10,
        intermediate: 20,
        advanced: 30
    },
    
    // Storage keys
    STORAGE_KEYS: {
        SCORE: 'oliver_score',
        HISTORY: 'oliver_history',
        LEVEL: 'oliver_level'
    }
};

// Niveles disponibles
const LEVELS = ['beginner', 'intermediate', 'advanced'];
const LEVEL_NAMES = {
    beginner: '🌱 Beginner',
    intermediate: '⭐ Intermediate',
    advanced: '🚀 Advanced'
};