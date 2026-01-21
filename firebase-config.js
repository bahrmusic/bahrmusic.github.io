// Firebase Configuration
const firebaseConfig = {
    databaseURL: "https://b-store-31433-default-rtdb.firebaseio.com/"
};

// Инициализация Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    const database = firebase.database();
    
    // Создаём простые функции для работы с базой
    window.dbHelpers = {
        // Добавить трек
        async addTrack(trackData) {
            const newTrackRef = database.ref('tracks').push();
            const trackId = newTrackRef.key;
            
            const trackWithId = {
                ...trackData,
                id: trackId,
                timestamp: Date.now(),
                plays: 0,
                likes: 0
            };
            
            await newTrackRef.set(trackWithId);
            return trackWithId;
        },
        
        // Получить все треки
        async getAllTracks() {
            const snapshot = await database.ref('tracks').once('value');
            const tracks = snapshot.val();
            
            if (!tracks) return [];
            
            // Преобразуем объект в массив
            return Object.keys(tracks).map(key => ({
                id: key,
                ...tracks[key]
            })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        },
        
        // Получить трек по ID
        async getTrackById(trackId) {
            const snapshot = await database.ref('tracks/' + trackId).once('value');
            return snapshot.val();
        },
        
        // Увеличить счётчик прослушиваний
        async incrementPlays(trackId) {
            const trackRef = database.ref('tracks/' + trackId);
            const snapshot = await trackRef.once('value');
            const track = snapshot.val();
            
            if (track) {
                await trackRef.update({
                    plays: (track.plays || 0) + 1
                });
            }
        },
        
        // Добавить лайк
        async addLike(trackId, userId) {
            await database.ref('likes/' + trackId + '/' + userId).set(true);
            
            // Обновляем счётчик лайков у трека
            const trackRef = database.ref('tracks/' + trackId);
            const snapshot = await trackRef.once('value');
            const track = snapshot.val();
            
            if (track) {
                await trackRef.update({
                    likes: (track.likes || 0) + 1
                });
            }
        },
        
        // Убрать лайк
        async removeLike(trackId, userId) {
            await database.ref('likes/' + trackId + '/' + userId).remove();
            
            // Обновляем счётчик лайков у трека
            const trackRef = database.ref('tracks/' + trackId);
            const snapshot = await trackRef.once('value');
            const track = snapshot.val();
            
            if (track && track.likes > 0) {
                await trackRef.update({
                    likes: track.likes - 1
                });
            }
        },
        
        // Проверить лайк пользователя
        async checkUserLike(trackId, userId) {
            const snapshot = await database.ref('likes/' + trackId + '/' + userId).once('value');
            return snapshot.exists();
        }
    };
    
    console.log('Firebase успешно инициализирован');
    
} catch (error) {
    console.error('Ошибка Firebase:', error);
    
    // Если Firebase не работает, используем заглушку
    window.dbHelpers = {
        addTrack: async function(trackData) {
            console.log('Демо: Добавление трека', trackData);
            return {
                ...trackData,
                id: 'demo-' + Date.now(),
                timestamp: Date.now(),
                plays: 0,
                likes: 0
            };
        },
        getAllTracks: async function() {
            console.log('Демо: Получение всех треков');
            return [];
        },
        getTrackById: async function() {
            console.log('Демо: Получение трека по ID');
            return null;
        },
        incrementPlays: async function() {
            console.log('Демо: Увеличение счётчика прослушиваний');
        },
        addLike: async function() {
            console.log('Демо: Добавление лайка');
        },
        removeLike: async function() {
            console.log('Демо: Удаление лайка');
        },
        checkUserLike: async function() {
            console.log('Демо: Проверка лайка');
            return false;
        }
    };
}

// Функция для получения ID пользователя
window.getUserId = function() {
    let userId = localStorage.getItem('bahr_user_id');
    if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('bahr_user_id', userId);
    }
    return userId;
};
