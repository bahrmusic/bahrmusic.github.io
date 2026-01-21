// Firebase Configuration
const firebaseConfig = {
    databaseURL: "https://b-store-31433-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// API URL for file hosting (из твоего файла)
const API_URL = 'https://yyf.mubilop.com';

// Firebase структура
const DB_PATHS = {
    TRACKS: 'tracks',
    PLAYS: 'plays',
    LIKES: 'likes',
    USERS: 'users'
};

// Helper functions
const dbHelpers = {
    // Добавить трек
    async addTrack(trackData) {
        const newTrackRef = database.ref(DB_PATHS.TRACKS).push();
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
        const snapshot = await database.ref(DB_PATHS.TRACKS).once('value');
        const tracks = snapshot.val() || {};
        return Object.values(tracks).sort((a, b) => b.timestamp - a.timestamp);
    },
    
    // Получить популярные треки
    async getPopularTracks(limit = 10) {
        const tracks = await this.getAllTracks();
        return tracks
            .sort((a, b) => b.plays - a.plays)
            .slice(0, limit);
    },
    
    // Получить трек по ID
    async getTrackById(trackId) {
        const snapshot = await database.ref(`${DB_PATHS.TRACKS}/${trackId}`).once('value');
        return snapshot.val();
    },
    
    // Увеличить счётчик прослушиваний
    async incrementPlays(trackId) {
        const trackRef = database.ref(`${DB_PATHS.TRACKS}/${trackId}`);
        const snapshot = await trackRef.once('value');
        const currentPlays = snapshot.val()?.plays || 0;
        await trackRef.update({ plays: currentPlays + 1 });
    },
    
    // Обновить лайки
    async toggleLike(trackId, userId) {
        const likeRef = database.ref(`${DB_PATHS.LIKES}/${trackId}/${userId}`);
        const snapshot = await likeRef.once('value');
        const isLiked = snapshot.exists();
        
        const trackRef = database.ref(`${DB_PATHS.TRACKS}/${trackId}`);
        const trackSnapshot = await trackRef.once('value');
        const currentLikes = trackSnapshot.val()?.likes || 0;
        
        if (isLiked) {
            await likeRef.remove();
            await trackRef.update({ likes: currentLikes - 1 });
            return false;
        } else {
            await likeRef.set(true);
            await trackRef.update({ likes: currentLikes + 1 });
            return true;
        }
    },
    
    // Проверить лайк пользователя
    async checkUserLike(trackId, userId) {
        const snapshot = await database.ref(`${DB_PATHS.LIKES}/${trackId}/${userId}`).once('value');
        return snapshot.exists();
    },
    
    // Поиск треков
    async searchTracks(query) {
        const tracks = await this.getAllTracks();
        const searchTerm = query.toLowerCase();
        
        return tracks.filter(track => 
            track.title.toLowerCase().includes(searchTerm) ||
            track.artist.toLowerCase().includes(searchTerm)
        );
    }
};

// Генерация уникального ID пользователя (простая реализация)
function getUserId() {
    let userId = localStorage.getItem('bahr_user_id');
    if (!userId) {
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('bahr_user_id', userId);
    }
    return userId;
}
