// ========================================
// VOICE MODULE - Síntesis y reconocimiento
// ========================================

const VoiceModule = (function() {
    let recognition = null;
    let isListening = false;
    let onResultCallback = null;
    let onErrorCallback = null;
    
    // Inicializar síntesis de voz
    function speak(text, onEnd = null) {
        if (!window.speechSynthesis) {
            console.warn('Speech synthesis not supported');
            return;
        }
        
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = CONFIG.VOICE_LANG;
        utterance.rate = CONFIG.VOICE_RATE;
        utterance.pitch = CONFIG.VOICE_PITCH;
        
        if (onEnd) {
            utterance.onend = onEnd;
        }
        
        // Intentar usar voz británica
        const setVoice = () => {
            const voices = window.speechSynthesis.getVoices();
            const britishVoice = voices.find(voice => voice.lang === CONFIG.VOICE_LANG);
            if (britishVoice) utterance.voice = britishVoice;
            window.speechSynthesis.speak(utterance);
        };
        
        if (window.speechSynthesis.getVoices().length === 0) {
            window.speechSynthesis.onvoiceschanged = setVoice;
        } else {
            setVoice();
        }
    }
    
    // Inicializar reconocimiento de voz
    function initRecognition(onResult, onError) {
        onResultCallback = onResult;
        onErrorCallback = onError;
        
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported');
            if (onErrorCallback) onErrorCallback('not_supported');
            return false;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = CONFIG.RECOGNITION_LANG;
        recognition.continuous = CONFIG.RECOGNITION_CONTINUOUS;
        recognition.interimResults = CONFIG.RECOGNITION_INTERIM;
        
        recognition.onstart = () => {
            isListening = true;
        };
        
        recognition.onend = () => {
            isListening = false;
        };
        
        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            if (onResultCallback) onResultCallback(transcript);
        };
        
        recognition.onerror = (event) => {
            if (onErrorCallback) onErrorCallback(event.error);
        };
        
        return true;
    }
    
    function startListening() {
        if (recognition && !isListening) {
            try {
                recognition.start();
                return true;
            } catch (e) {
                console.error('Error starting recognition:', e);
                return false;
            }
        }
        return false;
    }
    
    function stopListening() {
        if (recognition && isListening) {
            recognition.stop();
            return true;
        }
        return false;
    }
    
    function isSupported() {
        return !!(window.speechSynthesis && (window.SpeechRecognition || window.webkitSpeechRecognition));
    }
    
    // API pública
    return {
        speak,
        initRecognition,
        startListening,
        stopListening,
        isSupported,
        isListening: () => isListening
    };
})();