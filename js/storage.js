// ========================================
// STORAGE MODULE - IndexedDB para datos offline
// ========================================

const StorageModule = (function() {
    let db = null;
    let dbReady = false;
    let pendingOps = [];
    
    // Inicializar IndexedDB
    function initDB() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                console.warn('IndexedDB not supported, using localStorage fallback');
                resolve(false);
                return;
            }
            
            const request = indexedDB.open('ProfessorOliverDB', 1);
            
            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                resolve(false);
            };
            
            request.onsuccess = () => {
                db = request.result;
                dbReady = true;
                resolve(true);
            };
            
            request.onupgradeneeded = (event) => {
                db = event.target.result;
                
                // Store para historial de conversaciones
                if (!db.objectStoreNames.contains('conversations')) {
                    const store = db.createObjectStore('conversations', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('date', 'date', { unique: false });
                }
                
                // Store para ejercicios completados
                if (!db.objectStoreNames.contains('exercises')) {
                    const store = db.createObjectStore('exercises', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('date', 'date', { unique: false });
                    store.createIndex('level', 'level', { unique: false });
                }
                
                // Store para configuración
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }
    
    // Guardar conversación
    async function saveConversation(messages) {
        const conversation = {
            messages: messages,
            date: new Date().toISOString(),
            summary: messages.length > 0 ? messages[0].content.substring(0, 100) : 'Empty conversation'
        };
        
        if (!dbReady) {
            pendingOps.push(() => saveConversation(messages));
            return;
        }
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['conversations'], 'readwrite');
            const store = transaction.objectStore('conversations');
            const request = store.add(conversation);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Obtener historial de conversaciones
    async function getConversations(limit = 20) {
        if (!dbReady) return [];
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['conversations'], 'readonly');
            const store = transaction.objectStore('conversations');
            const index = store.index('date');
            const request = index.openCursor(null, 'prev');
            
            const results = [];
            let count = 0;
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && count < limit) {
                    results.push(cursor.value);
                    count++;
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    // Guardar ejercicio completado
    async function saveExercise(exercise) {
        if (!dbReady) return;
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['exercises'], 'readwrite');
            const store = transaction.objectStore('exercises');
            const record = {
                ...exercise,
                date: new Date().toISOString()
            };
            const request = store.add(record);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    // Obtener estadísticas
    async function getStats() {
        if (!dbReady) return { totalExercises: 0, byLevel: { beginner: 0, intermediate: 0, advanced: 0 } };
        
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['exercises'], 'readonly');
            const store = transaction.objectStore('exercises');
            const request = store.getAll();
            
            request.onsuccess = () => {
                const exercises = request.result;
                const stats = {
                    totalExercises: exercises.length,
                    byLevel: {
                        beginner: exercises.filter(e => e.level === 'beginner').length,
                        intermediate: exercises.filter(e => e.level === 'intermediate').length,
                        advanced: exercises.filter(e => e.level === 'advanced').length
                    }
                };
                resolve(stats);
            };
            request.onerror = () => reject(request.error);
        });
    }
    
    // Guardar puntuación en localStorage (fallback)
    function saveScore(score) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.SCORE, score);
    }
    
    function loadScore() {
        return parseInt(localStorage.getItem(CONFIG.STORAGE_KEYS.SCORE) || '0');
    }
    
    function saveLevel(level) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.LEVEL, level);
    }
    
    function loadLevel() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.LEVEL) || 'intermediate';
    }
    
    // API pública
    return {
        initDB,
        saveConversation,
        getConversations,
        saveExercise,
        getStats,
        saveScore,
        loadScore,
        saveLevel,
        loadLevel
    };
})();