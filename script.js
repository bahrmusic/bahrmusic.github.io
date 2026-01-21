// Делаем playerApp глобально доступным
window.playerApp = {
    playTrack: null // Будет установлено позже
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('Инициализация музыкального плеера...');
    console.log('dbHelpers доступен:', typeof dbHelpers !== 'undefined');
    
    // Проверяем доступность dbHelpers
    if (typeof dbHelpers === 'undefined') {
        console.error('dbHelpers не определен');
        
        // Показываем сообщение об ошибке
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="
                background: rgba(220, 53, 69, 0.2);
                color: #dc3545;
                padding: 20px;
                border-radius: 10px;
                margin: 20px;
                border: 2px solid #dc3545;
                text-align: center;
            ">
                <h4><i class="fas fa-exclamation-triangle"></i> Ошибка подключения</h4>
                <p>Не удалось подключиться к базе данных. Пожалуйста, обновите страницу.</p>
            </div>
        `;
        
        document.querySelector('.main-content').prepend(errorDiv);
        return;
    }
    
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
        console.log('Загрузка треков...');
        await loadTracks();
        checkUrlForTrack();
        setupEventListeners();
        updatePlayerUI();
        
        console.log('Инициализация завершена. Загружено треков:', state.tracks.length);
    }
    
    // Загрузить все треки
    async function loadTracks() {
        try {
            showLoading(true);
            state.tracks = await dbHelpers.getAllTracks();
            console.log('Треки загружены:', state.tracks.length);
            
            // Обновить UI
            updateTrackLists();
            showLoading(false);
            
        } catch (error) {
            console.error('Ошибка загрузки треков:', error);
            showLoading(false);
            
            // Показать демо-треки при ошибке
            state.tracks = getDemoTracks();
            updateTrackLists();
        }
    }
    
    // Демо-треки для тестирования
    function getDemoTracks() {
        return [
            {
                id: 'demo-1',
                title: 'Пример трека 1',
                artist: 'Исполнитель',
                audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                duration: 180000,
                plays: 42,
                likes: 5,
                timestamp: Date.now() - 86400000,
                genre: 'pop'
            },
            {
                id: 'demo-2',
                title: 'Пример трека 2',
                artist: 'Другой исполнитель',
                audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
                duration: 210000,
                plays: 28,
                likes: 3,
                timestamp: Date.now() - 172800000,
                genre: 'rock'
            }
        ];
    }
    
    // Проверить URL на наличие трека
    function checkUrlForTrack() {
        const urlParams = new URLSearchParams(window.location.search);
        const trackId = urlParams.get('id');
        
        console.log('Проверка URL на трек. ID:', trackId);
        
        if (trackId) {
            // Найти трек по ID в загруженных треках
            const trackIndex = state.tracks.findIndex(track => track.id === trackId);
            if (trackIndex !== -1) {
                console.log('Трек найден в списке, индекс:', trackIndex);
                playTrack(trackIndex);
            } else if (trackId.startsWith('demo-')) {
                // Это демо-трек, уже в списке
                console.log('Это демо-трек');
            } else {
                // Если трек не в загруженных списках, загрузить отдельно
                console.log('Трек не найден, загружаем по ID...');
                loadTrackById(trackId);
            }
        }
    }
    
    // Загрузить трек по ID
    async function loadTrackById(trackId) {
        try {
            console.log('Загрузка трека по ID:', trackId);
            const track = await dbHelpers.getTrackById(trackId);
            if (track) {
                console.log('Трек загружен:', track.title);
                state.tracks.push(track);
                const trackIndex = state.tracks.length - 1;
                playTrack(trackIndex);
            } else {
                console.log('Трек не найден в базе данных');
            }
        } catch (error) {
            console.error('Ошибка загрузки трека:', error);
        }
    }
    
    // Воспроизвести трек
    async function playTrack(index) {
        console.log('Воспроизведение трека, индекс:', index);
        
        if (index < 0 || index >= state.tracks.length) {
            console.error('Неверный индекс трека:', index);
            return;
        }
        
        state.currentTrackIndex = index;
        const track = state.tracks[index];
        state.currentTrackId = track.id;
        
        console.log('Текущий трек:', track.title, 'URL:', track.audioUrl);
        
        // Установить источник аудио
        audioPlayer.src = track.audioUrl;
        
        // Обновить UI
        updatePlayerInfo(track);
        updateActiveTrack();
        
        // Увеличить счётчик прослушиваний
        try {
            await dbHelpers.incrementPlays(track.id);
            console.log('Счётчик прослушиваний увеличен');
        } catch (error) {
            console.error('Ошибка увеличения счётчика:', error);
        }
        
        // Воспроизвести
        try {
            await audioPlayer.play();
            state.isPlaying = true;
            updatePlayButton();
            console.log('Трек начал воспроизводиться');
        } catch (error) {
            console.error('Ошибка воспроизведения:', error);
            state.isPlaying = false;
            updatePlayButton();
        }
        
        // Проверить лайк
        try {
            const isLiked = await dbHelpers.checkUserLike(track.id, state.userId);
            updateLikeButton(isLiked);
            if (isLiked) {
                state.likedTracks.add(track.id);
            }
        } catch (error) {
            console.error('Ошибка проверки лайка:', error);
        }
    }
    
    // Обновить информацию о треке в плеере
    function updatePlayerInfo(track) {
        const currentTrackInfo = document.getElementById('currentTrackInfo');
        
        document.querySelector('.track-title').textContent = track.title;
        document.querySelector('.track-artist').textContent = track.artist;
        
        const trackImage = document.querySelector('.current-track .track-image');
        if (track.imageUrl) {
            trackImage.innerHTML = `<img src="${track.imageUrl}" alt="${track.title}" style="width: 100%; height: 100%; border-radius: 8px; object-fit: cover;">`;
        } else {
            trackImage.innerHTML = '<i class="fas fa-music"></i>';
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
            .sort((a, b) => (b.plays || 0) - (a.plays || 0))
            .slice(0, 8);
        
        popularContainer.innerHTML = popularTracks.map((track, index) => `
            <div class="track-card" data-track-id="${track.id}" onclick="window.app.playTrack(${state.tracks.indexOf(track)})">
                <div class="track-image">
                    <i class="fas fa-music"></i>
                </div>
                <div class="track-info">
                    <h4>${track.title || 'Без названия'}</h4>
                    <p>${track.artist || 'Неизвестный исполнитель'}</p>
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
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 8);
        
        newContainer.innerHTML = newTracks.map((track, index) => `
            <div class="track-card" data-track-id="${track.id}" onclick="window.app.playTrack(${state.tracks.indexOf(track)})">
                <div class="track-image">
                    <i class="fas fa-music"></i>
                </div>
                <div class="track-info">
                    <h4>${track.title || 'Без названия'}</h4>
                    <p>${track.artist || 'Неизвестный исполнитель'}</p>
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
            <div class="track-row" data-track-id="${track.id}" onclick="window.app.playTrack(${index})">
                <div class="track-number">${index + 1}</div>
                <div class="track-title">
                    <h4>${track.title || 'Без названия'}</h4>
                    <p class="track-artist">${track.artist || 'Неизвестный исполнитель'}</p>
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
        console.log('Настройка обработчиков событий...');
        
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
        
        // Клик по фону модалки для закрытия
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) {
                shareModal.classList.remove('active');
            }
        });
        
        // Поиск
        if (searchInput) {
            searchInput.addEventListener('input', debounce(handleSearch, 300));
        }
        
        // Обработка завершения трека
        audioPlayer.addEventListener('ended', playNext);
        
        // Кнопки "Показать все"
        const loadPopularBtn = document.getElementById('loadPopular');
        const loadNewBtn = document.getElementById('loadNew');
        
        if (loadPopularBtn) {
            loadPopularBtn.addEventListener('click', () => {
                const popularTracks = [...state.tracks]
                    .sort((a, b) => (b.plays || 0) - (a.plays || 0));
                showAllTracksModal('Популярные треки', popularTracks);
            });
        }
        
        if (loadNewBtn) {
            loadNewBtn.addEventListener('click', () => {
                const newTracks = [...state.tracks]
                    .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
                showAllTracksModal('Новинки', newTracks);
            });
        }
        
        // Обновляем глобальную функцию
        window.playerApp.playTrack = playTrack;
        window.app.playTrack = playTrack;
    }
    
    // Воспроизвести/пауза
    async function togglePlay() {
        console.log('Toggle play, текущее состояние:', state.isPlaying);
        
        if (!state.currentTrackId) {
            // Если нет текущего трека, начать с первого
            if (state.tracks.length > 0) {
                console.log('Начинаем воспроизведение с первого трека');
                await playTrack(0);
            } else {
                console.log('Нет треков для воспроизведения');
            }
            return;
        }
        
        if (state.isPlaying) {
            audioPlayer.pause();
            state.isPlaying = false;
            console.log('Трек поставлен на паузу');
        } else {
            try {
                await audioPlayer.play();
                state.isPlaying = true;
                console.log('Трек продолжен');
            } catch (error) {
                console.error('Ошибка возобновления:', error);
            }
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
        
        console.log('Следующий трек, индекс:', nextIndex);
        playTrack(nextIndex);
    }
    
    // Предыдущий трек
    function playPrevious() {
        if (state.tracks.length === 0) return;
        
        let prevIndex = state.currentTrackIndex - 1;
        if (prevIndex < 0) {
            prevIndex = state.tracks.length - 1; // Зацикливание
        }
        
        console.log('Предыдущий трек, индекс:', prevIndex);
        playTrack(prevIndex);
    }
    
    // Обновить прогресс
    function updateProgress() {
        if (!audioPlayer.duration || isNaN(audioPlayer.duration)) return;
        
        const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progressFill.style.width = `${percent}%`;
        
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        totalTimeEl.textContent = formatTime(audioPlayer.duration);
    }
    
    // Перемотка
    function seek(e) {
        if (!audioPlayer.duration || isNaN(audioPlayer.duration)) return;
        
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
        if (!state.currentTrackId) {
            console.log('Нет текущего трека для лайка');
            return;
        }
        
        console.log('Переключение лайка для трека:', state.currentTrackId);
        
        try {
            const isNowLiked = await dbHelpers.toggleLike(state.currentTrackId, state.userId);
            updateLikeButton(isNowLiked);
            
            // Обновить счётчик лайков в UI
            if (isNowLiked) {
                state.likedTracks.add(state.currentTrackId);
                console.log('Трек лайкнут');
            } else {
                state.likedTracks.delete(state.currentTrackId);
                console.log('Лайк убран');
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
        
        console.log('Ссылка для шеринга:', shareUrl);
    }
    
    // Копировать ссылку для шеринга
    function copyShareUrl() {
        shareUrlInput.select();
        shareUrlInput.setSelectionRange(0, 99999); // Для мобильных
        
        try {
            navigator.clipboard.writeText(shareUrlInput.value).then(() => {
                // Визуальная обратная связь
                const originalText = copyShareUrlBtn.textContent;
                copyShareUrlBtn.textContent = 'Скопировано!';
                copyShareUrlBtn.style.background = '#28a745';
                
                setTimeout(() => {
                    copyShareUrlBtn.textContent = originalText;
                    copyShareUrlBtn.style.background = '';
                }, 2000);
            });
        } catch (err) {
            // Fallback для старых браузеров
            document.execCommand('copy');
            
            const originalText = copyShareUrlBtn.textContent;
            copyShareUrlBtn.textContent = 'Скопировано!';
            copyShareUrlBtn.style.background = '#28a745';
            
            setTimeout(() => {
                copyShareUrlBtn.textContent = originalText;
                copyShareUrlBtn.style.background = '';
            }, 2000);
        }
    }
    
    // Поиск треков
    async function handleSearch(e) {
        const query = e.target.value.trim();
        
        if (query.length < 2) {
            updateAllTracks();
            return;
        }
        
        console.log('Поиск по запросу:', query);
        
        try {
            const results = await dbHelpers.searchTracks(query);
            console.log('Найдено результатов:', results.length);
            
            // Показать результаты поиска
            const allContainer = document.getElementById('allTracks');
            if (allContainer) {
                if (results.length === 0) {
                    allContainer.innerHTML = `
                        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
                            <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 20px;"></i>
                            <h3>Ничего не найдено</h3>
                            <p>Попробуйте другой запрос</p>
                        </div>
                    `;
                } else {
                    allContainer.innerHTML = results.map((track, index) => {
                        const trackIndex = state.tracks.findIndex(t => t.id === track.id);
                        return `
                            <div class="track-row" data-track-id="${track.id}" onclick="window.app.playTrack(${trackIndex})">
                                <div class="track-number">${index + 1}</div>
                                <div class="track-title">
                                    <h4>${track.title || 'Без названия'}</h4>
                                    <p class="track-artist">${track.artist || 'Неизвестный исполнитель'}</p>
                                </div>
                                <div class="track-duration">${formatDuration(track.duration || 0)}</div>
                                <div class="play-icon">
                                    <i class="fas fa-play"></i>
                                </div>
                            </div>
                        `;
                    }).join('');
                }
            }
        } catch (error) {
            console.error('Ошибка поиска:', error);
        }
    }
    
    // Показать все треки в модальном окне
    function showAllTracksModal(title, tracks) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="tracks-list">
                        ${tracks.map((track, index) => {
                            const trackIndex = state.tracks.findIndex(t => t.id === track.id);
                            return `
                                <div class="track-row" data-track-id="${track.id}" onclick="window.app.playTrack(${trackIndex}); document.querySelector('.modal.active').classList.remove('active')">
                                    <div class="track-number">${index + 1}</div>
                                    <div class="track-title">
                                        <h4>${track.title || 'Без названия'}</h4>
                                        <p class="track-artist">${track.artist || 'Неизвестный исполнитель'}</p>
                                    </div>
                                    <div class="track-duration">${formatDuration(track.duration || 0)}</div>
                                    <div class="play-icon">
                                        <i class="fas fa-play"></i>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Закрытие модалки
        modal.querySelector('.close-modal').addEventListener('click', () => {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        });
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
                setTimeout(() => modal.remove(), 300);
            }
        });
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
        if (isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    
    function formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        return formatTime(seconds);
    }
    
    function formatDate(timestamp) {
        if (!timestamp) return 'Дата неизвестна';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 86400000) { // 24 часа
            return 'Сегодня';
        } else if (diff < 172800000) { // 48 часов
            return 'Вчера';
        } else if (diff < 604800000) { // 7 дней
            const days = Math.floor(diff / 86400000);
            return `${days} дня назад`;
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
            document.querySelector('.player-container').style.pointerEvents = 'none';
        } else {
            document.querySelector('.player-container').style.opacity = '1';
            document.querySelector('.player-container').style.pointerEvents = 'auto';
        }
    }
    
    // Инициализировать приложение
    init();
});
