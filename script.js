document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const audioPlayer = document.getElementById('audioPlayer');
    const playBtn = document.getElementById('playBtn');
    const playIcon = document.getElementById('playIcon');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    const currentTimeEl = document.getElementById('currentTime');
    const totalTimeEl = document.getElementById('totalTime');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeIcon = document.getElementById('volumeIcon');
    const likeBtn = document.getElementById('likeBtn');
    const shareBtn = document.getElementById('shareBtn');
    const shareModal = document.getElementById('shareModal');
    const shareUrlInput = document.getElementById('shareUrlInput');
    const copyShareUrlBtn = document.getElementById('copyShareUrl');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const searchInput = document.getElementById('searchInput');
    
    // Состояние приложения
    let state = {
        currentTrackIndex: -1,
        tracks: [],
        queue: [],
        isPlaying: false,
        userId: getUserId(),
        currentTrackId: null,
        likedTracks: new Set()
    };
    
    // Инициализация
    async function init() {
        await loadTracks();
        checkUrlForTrack();
        setupEventListeners();
        updatePlayerUI();
        
        // Проверить лайки текущего пользователя
        await loadUserLikes();
    }
    
    // Загрузить все треки
    async function loadTracks() {
        try {
            showLoading(true);
            state.tracks = await dbHelpers.getAllTracks();
            
            // Обновить UI
            updateTrackLists();
            showLoading(false);
            
            console.log(`Загружено ${state.tracks.length} треков`);
        } catch (error) {
            console.error('Ошибка загрузки треков:', error);
            showLoading(false);
        }
    }
    
    // Проверить URL на наличие трека
    function checkUrlForTrack() {
        const urlParams = new URLSearchParams(window.location.search);
        const trackId = urlParams.get('id');
        
        if (trackId) {
            // Найти трек по ID
            const trackIndex = state.tracks.findIndex(track => track.id === trackId);
            if (trackIndex !== -1) {
                playTrack(trackIndex);
            } else {
                // Если трек не в загруженных списках, загрузить отдельно
                loadTrackById(trackId);
            }
        }
    }
    
    // Загрузить трек по ID
    async function loadTrackById(trackId) {
        try {
            const track = await dbHelpers.getTrackById(trackId);
            if (track) {
                state.tracks.push(track);
                const trackIndex = state.tracks.length - 1;
                playTrack(trackIndex);
            }
        } catch (error) {
            console.error('Ошибка загрузки трека:', error);
        }
    }
    
    // Воспроизвести трек
    async function playTrack(index) {
        if (index < 0 || index >= state.tracks.length) return;
        
        state.currentTrackIndex = index;
        const track = state.tracks[index];
        state.currentTrackId = track.id;
        
        // Установить источник аудио
        audioPlayer.src = track.audioUrl;
        
        // Обновить UI
        updatePlayerInfo(track);
        updateActiveTrack();
        
        // Увеличить счётчик прослушиваний
        await dbHelpers.incrementPlays(track.id);
        
        // Воспроизвести
        await audioPlayer.play();
        state.isPlaying = true;
        updatePlayButton();
        
        // Проверить лайк
        const isLiked = await dbHelpers.checkUserLike(track.id, state.userId);
        updateLikeButton(isLiked);
    }
    
    // Обновить информацию о треке в плеере
    function updatePlayerInfo(track) {
        const currentTrackInfo = document.getElementById('currentTrackInfo');
        
        document.querySelector('.track-title').textContent = track.title;
        document.querySelector('.track-artist').textContent = track.artist;
        document.querySelector('.track-image i').className = track.imageUrl ? 
            '' : 'fas fa-music';
        
        // Если есть обложка
        if (track.imageUrl) {
            const trackImage = document.querySelector('.track-image');
            trackImage.innerHTML = `<img src="${track.imageUrl}" alt="${track.title}">`;
        }
    }
    
    // Обновить активный трек в списках
    function updateActiveTrack() {
        // Убрать активный класс со всех треков
        document.querySelectorAll('.track-card, .track-row').forEach(el => {
            el.classList.remove('active');
        });
        
        // Добавить активный класс текущему треку
        const trackId = state.tracks[state.currentTrackIndex]?.id;
        if (trackId) {
            document.querySelectorAll(`[data-track-id="${trackId}"]`).forEach(el => {
                el.classList.add('active');
            });
        }
    }
    
    // Обновить кнопку воспроизведения
    function updatePlayButton() {
        if (state.isPlaying) {
            playIcon.className = 'fas fa-pause';
            playBtn.setAttribute('aria-label', 'Пауза');
        } else {
            playIcon.className = 'fas fa-play';
            playBtn.setAttribute('aria-label', 'Воспроизвести');
        }
    }
    
    // Обновить кнопку лайка
    function updateLikeButton(isLiked) {
        if (isLiked) {
            likeBtn.innerHTML = '<i class="fas fa-heart"></i>';
            likeBtn.classList.add('liked');
        } else {
            likeBtn.innerHTML = '<i class="far fa-heart"></i>';
            likeBtn.classList.remove('liked');
        }
    }
    
    // Загрузить лайки пользователя
    async function loadUserLikes() {
        // Загрузка лайков пользователя (упрощённая реализация)
        // В реальном приложении нужно загружать все лайки пользователя
    }
    
    // Обновить списки треков
    function updateTrackLists() {
        updatePopularTracks();
        updateNewTracks();
        updateAllTracks();
    }
    
    // Обновить популярные треки
    function updatePopularTracks() {
        const popularContainer = document.getElementById('popularTracks');
        if (!popularContainer) return;
        
        const popularTracks = [...state.tracks]
            .sort((a, b) => b.plays - a.plays)
            .slice(0, 8);
        
        popularContainer.innerHTML = popularTracks.map((track, index) => `
            <div class="track-card" data-track-id="${track.id}" onclick="app.playTrack(${state.tracks.indexOf(track)})">
                <div class="track-image">
                    <i class="fas fa-music"></i>
                </div>
                <div class="track-info">
                    <h4>${track.title}</h4>
                    <p>${track.artist}</p>
                </div>
                <div class="track-meta">
                    <span>${track.genre || 'Не указан'}</span>
                    <span><i class="fas fa-play"></i> ${track.plays || 0}</span>
                </div>
            </div>
        `).join('');
    }
    
    // Обновить новинки
    function updateNewTracks() {
        const newContainer = document.getElementById('newTracks');
        if (!newContainer) return;
        
        const newTracks = [...state.tracks]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 8);
        
        newContainer.innerHTML = newTracks.map((track, index) => `
            <div class="track-card" data-track-id="${track.id}" onclick="app.playTrack(${state.tracks.indexOf(track)})">
                <div class="track-image">
                    <i class="fas fa-music"></i>
                </div>
                <div class="track-info">
                    <h4>${track.title}</h4>
                    <p>${track.artist}</p>
                </div>
                <div class="track-meta">
                    <span>${formatDate(track.timestamp)}</span>
                    <span><i class="far fa-clock"></i></span>
                </div>
            </div>
        `).join('');
    }
    
    // Обновить все треки
    function updateAllTracks() {
        const allContainer = document.getElementById('allTracks');
        if (!allContainer) return;
        
        allContainer.innerHTML = state.tracks.map((track, index) => `
            <div class="track-row" data-track-id="${track.id}" onclick="app.playTrack(${index})">
                <div class="track-number">${index + 1}</div>
                <div class="track-title">
                    <h4>${track.title}</h4>
                    <p class="track-artist">${track.artist}</p>
                </div>
                <div class="track-duration">${formatDuration(track.duration || 0)}</div>
                <div class="play-icon">
                    <i class="fas fa-play"></i>
                </div>
            </div>
        `).join('');
    }
    
    // Настройка обработчиков событий
    function setupEventListeners() {
        // Воспроизведение/пауза
        playBtn.addEventListener('click', togglePlay);
        
        // Перемотка
        prevBtn.addEventListener('click', playPrevious);
        nextBtn.addEventListener('click', playNext);
        
        // Прогресс
        audioPlayer.addEventListener('timeupdate', updateProgress);
        progressBar.addEventListener('click', seek);
        
        // Громкость
        volumeSlider.addEventListener('input', updateVolume);
        
        // Лайк
        likeBtn.addEventListener('click', toggleLike);
        
        // Шеринг
        shareBtn.addEventListener('click', showShareModal);
        copyShareUrlBtn.addEventListener('click', copyShareUrl);
        
        // Закрытие модалки
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                shareModal.classList.remove('active');
            });
        });
        
        // Поиск
        if (searchInput) {
            searchInput.addEventListener('input', debounce(handleSearch, 300));
        }
        
        // Обработка завершения трека
        audioPlayer.addEventListener('ended', playNext);
        
        // Глобальные методы для использования в onclick
        window.app = {
            playTrack: (index) => playTrack(index)
        };
    }
    
    // Воспроизвести/пауза
    async function togglePlay() {
        if (!state.currentTrackId) {
            // Если нет текущего трека, начать с первого
            if (state.tracks.length > 0) {
                await playTrack(0);
            }
            return;
        }
        
        if (state.isPlaying) {
            audioPlayer.pause();
            state.isPlaying = false;
        } else {
            await audioPlayer.play();
            state.isPlaying = true;
        }
        updatePlayButton();
    }
    
    // Следующий трек
    function playNext() {
        if (state.tracks.length === 0) return;
        
        let nextIndex = state.currentTrackIndex + 1;
        if (nextIndex >= state.tracks.length) {
            nextIndex = 0; // Зацикливание
        }
        
        playTrack(nextIndex);
    }
    
    // Предыдущий трек
    function playPrevious() {
        if (state.tracks.length === 0) return;
        
        let prevIndex = state.currentTrackIndex - 1;
        if (prevIndex < 0) {
            prevIndex = state.tracks.length - 1; // Зацикливание
        }
        
        playTrack(prevIndex);
    }
    
    // Обновить прогресс
    function updateProgress() {
        if (!audioPlayer.duration) return;
        
        const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressFill.style.width = `${percent}%`;
        
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        totalTimeEl.textContent = formatTime(audioPlayer.duration);
    }
    
    // Перемотка
    function seek(e) {
        if (!audioPlayer.duration) return;
        
        const rect = progressBar.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        audioPlayer.currentTime = percent * audioPlayer.duration;
    }
    
    // Обновить громкость
    function updateVolume() {
        const volume = volumeSlider.value / 100;
        audioPlayer.volume = volume;
        
        // Обновить иконку
        if (volume === 0) {
            volumeIcon.className = 'fas fa-volume-mute';
        } else if (volume < 0.5) {
            volumeIcon.className = 'fas fa-volume-down';
        } else {
            volumeIcon.className = 'fas fa-volume-up';
        }
    }
    
    // Лайк/дизлайк
    async function toggleLike() {
        if (!state.currentTrackId) return;
        
        try {
            const isNowLiked = await dbHelpers.toggleLike(state.currentTrackId, state.userId);
            updateLikeButton(isNowLiked);
            
            // Обновить счётчик лайков в UI
            if (isNowLiked) {
                state.likedTracks.add(state.currentTrackId);
            } else {
                state.likedTracks.delete(state.currentTrackId);
            }
        } catch (error) {
            console.error('Ошибка при лайке:', error);
        }
    }
    
    // Показать модалку шеринга
    function showShareModal() {
        if (!state.currentTrackId) {
            alert('Сначала выберите трек для воспроизведения');
            return;
        }
        
        const currentUrl = window.location.origin + window.location.pathname;
        const shareUrl = `${currentUrl}?id=${state.currentTrackId}`;
        
        shareUrlInput.value = shareUrl;
        shareModal.classList.add('active');
    }
    
    // Копировать ссылку для шеринга
    function copyShareUrl() {
        shareUrlInput.select();
        document.execCommand('copy');
        
        // Визуальная обратная связь
        const originalText = copyShareUrlBtn.textContent;
        copyShareUrlBtn.textContent = 'Скопировано!';
        copyShareUrlBtn.style.background = '#28a745';
        
        setTimeout(() => {
            copyShareUrlBtn.textContent = originalText;
            copyShareUrlBtn.style.background = '';
        }, 2000);
    }
    
    // Поиск треков
    async function handleSearch(e) {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            updateTrackLists();
            return;
        }
        
        try {
            const results = await dbHelpers.searchTracks(query);
            
            // Показать результаты поиска
            const allContainer = document.getElementById('allTracks');
            if (allContainer) {
                allContainer.innerHTML = results.map((track, index) => `
                    <div class="track-row" data-track-id="${track.id}" onclick="app.playTrack(${state.tracks.findIndex(t => t.id === track.id)})">
                        <div class="track-number">${index + 1}</div>
                        <div class="track-title">
                            <h4>${track.title}</h4>
                            <p class="track-artist">${track.artist}</p>
                        </div>
                        <div class="track-duration">${formatDuration(track.duration || 0)}</div>
                        <div class="play-icon">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Ошибка поиска:', error);
        }
    }
    
    // Показать/скрыть загрузку
    function showLoading(show) {
        const loadingElements = document.querySelectorAll('.loading');
        loadingElements.forEach(el => {
            el.style.display = show ? 'flex' : 'none';
        });
    }
    
    // Вспомогательные функции
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    
    function formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        return formatTime(seconds);
    }
    
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 86400000) { // 24 часа
            return 'Сегодня';
        } else if (diff < 172800000) { // 48 часов
            return 'Вчера';
        } else {
            return date.toLocaleDateString('ru-RU');
        }
    }
    
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Обновить UI плеера
    function updatePlayerUI() {
        if (state.tracks.length === 0) {
            document.querySelector('.player-container').style.opacity = '0.7';
        } else {
            document.querySelector('.player-container').style.opacity = '1';
        }
    }
    
    // Инициализировать приложение
    init();
});
