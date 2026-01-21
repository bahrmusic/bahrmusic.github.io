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
    
    // Состояние
    let state = {
        currentTrackIndex: -1,
        tracks: [],
        isPlaying: false,
        currentTrackId: null
    };
    
    // Инициализация
    async function init() {
        await loadTracks();
        checkUrlForTrack();
        setupEventListeners();
    }
    
    // Загрузка треков
    async function loadTracks() {
        try {
            if (typeof dbHelpers !== 'undefined' && dbHelpers.getAllTracks) {
                state.tracks = await dbHelpers.getAllTracks();
                updateTrackLists();
            } else {
                // Если Firebase не работает, показываем демо
                showDemoTracks();
            }
        } catch (error) {
            console.log('Используем демо-треки из-за ошибки:', error);
            showDemoTracks();
        }
    }
    
    // Демо-треки для тестирования
    function showDemoTracks() {
        state.tracks = [
            {
                id: 'demo1',
                title: 'Пример трека 1',
                artist: 'Тестовый исполнитель',
                audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                duration: 180000,
                plays: 10,
                likes: 2,
                genre: 'pop'
            },
            {
                id: 'demo2', 
                title: 'Пример трека 2',
                artist: 'Другой исполнитель',
                audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
                duration: 210000,
                plays: 5,
                likes: 1,
                genre: 'rock'
            }
        ];
        
        updateTrackLists();
    }
    
    // Проверка URL
    function checkUrlForTrack() {
        const urlParams = new URLSearchParams(window.location.search);
        const trackId = urlParams.get('id');
        
        if (trackId) {
            const trackIndex = state.tracks.findIndex(track => track.id === trackId);
            if (trackIndex !== -1) {
                playTrack(trackIndex);
            }
        }
    }
    
    // Воспроизведение трека
    async function playTrack(index) {
        if (index < 0 || index >= state.tracks.length) return;
        
        state.currentTrackIndex = index;
        const track = state.tracks[index];
        state.currentTrackId = track.id;
        
        audioPlayer.src = track.audioUrl;
        updatePlayerInfo(track);
        updateActiveTrack();
        
        try {
            await audioPlayer.play();
            state.isPlaying = true;
            updatePlayButton();
            
            // Увеличиваем счётчик прослушиваний
            if (typeof dbHelpers !== 'undefined' && dbHelpers.incrementPlays) {
                await dbHelpers.incrementPlays(track.id);
            }
        } catch (error) {
            console.error('Ошибка воспроизведения:', error);
        }
    }
    
    // Обновление информации о треке
    function updatePlayerInfo(track) {
        document.querySelector('.track-title').textContent = track.title;
        document.querySelector('.track-artist').textContent = track.artist;
    }
    
    // Обновление активного трека
    function updateActiveTrack() {
        document.querySelectorAll('.track-card, .track-row').forEach(el => {
            el.classList.remove('active');
        });
        
        const trackId = state.currentTrackId;
        if (trackId) {
            document.querySelectorAll(`[data-track-id="${trackId}"]`).forEach(el => {
                el.classList.add('active');
            });
        }
    }
    
    // Обновление кнопки воспроизведения
    function updatePlayButton() {
        if (state.isPlaying) {
            playIcon.className = 'fas fa-pause';
        } else {
            playIcon.className = 'fas fa-play';
        }
    }
    
    // Обновление списков треков
    function updateTrackLists() {
        // Популярные треки
        const popularContainer = document.getElementById('popularTracks');
        if (popularContainer) {
            const popularTracks = [...state.tracks]
                .sort((a, b) => (b.plays || 0) - (a.plays || 0))
                .slice(0, 8);
            
            popularContainer.innerHTML = popularTracks.map((track, index) => `
                <div class="track-card" data-track-id="${track.id}" onclick="playTrackFromList(${state.tracks.indexOf(track)})">
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
        
        // Новинки
        const newContainer = document.getElementById('newTracks');
        if (newContainer) {
            const newTracks = [...state.tracks]
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
                .slice(0, 8);
            
            newContainer.innerHTML = newTracks.map((track, index) => `
                <div class="track-card" data-track-id="${track.id}" onclick="playTrackFromList(${state.tracks.indexOf(track)})">
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
        
        // Все треки
        const allContainer = document.getElementById('allTracks');
        if (allContainer) {
            allContainer.innerHTML = state.tracks.map((track, index) => `
                <div class="track-row" data-track-id="${track.id}" onclick="playTrackFromList(${index})">
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
    }
    
    // Настройка обработчиков
    function setupEventListeners() {
        // Воспроизведение/пауза
        playBtn.addEventListener('click', togglePlay);
        
        // Перемотка
        prevBtn.addEventListener('click', () => {
            if (state.tracks.length === 0) return;
            let prevIndex = state.currentTrackIndex - 1;
            if (prevIndex < 0) prevIndex = state.tracks.length - 1;
            playTrack(prevIndex);
        });
        
        nextBtn.addEventListener('click', () => {
            if (state.tracks.length === 0) return;
            let nextIndex = state.currentTrackIndex + 1;
            if (nextIndex >= state.tracks.length) nextIndex = 0;
            playTrack(nextIndex);
        });
        
        // Прогресс
        audioPlayer.addEventListener('timeupdate', () => {
            if (!audioPlayer.duration || isNaN(audioPlayer.duration)) return;
            const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
            progressFill.style.width = `${percent}%`;
            
            currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
            totalTimeEl.textContent = formatTime(audioPlayer.duration);
        });
        
        progressBar.addEventListener('click', (e) => {
            if (!audioPlayer.duration || isNaN(audioPlayer.duration)) return;
            const rect = progressBar.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            audioPlayer.currentTime = percent * audioPlayer.duration;
        });
        
        // Громкость
        volumeSlider.addEventListener('input', () => {
            const volume = volumeSlider.value / 100;
            audioPlayer.volume = volume;
            
            if (volume === 0) {
                volumeIcon.className = 'fas fa-volume-mute';
            } else if (volume < 0.5) {
                volumeIcon.className = 'fas fa-volume-down';
            } else {
                volumeIcon.className = 'fas fa-volume-up';
            }
        });
        
        // Шеринг
        shareBtn.addEventListener('click', () => {
            if (!state.currentTrackId) {
                alert('Сначала выберите трек');
                return;
            }
            
            const shareUrl = window.location.origin + window.location.pathname + '?id=' + state.currentTrackId;
            shareUrlInput.value = shareUrl;
            shareModal.classList.add('active');
        });
        
        copyShareUrlBtn.addEventListener('click', () => {
            shareUrlInput.select();
            document.execCommand('copy');
            copyShareUrlBtn.textContent = 'Скопировано!';
            setTimeout(() => copyShareUrlBtn.textContent = 'Копировать', 2000);
        });
        
        // Закрытие модалки
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                shareModal.classList.remove('active');
            });
        });
        
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) {
                shareModal.classList.remove('active');
            }
        });
        
        // Поиск
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                const allContainer = document.getElementById('allTracks');
                
                if (query.length < 2) {
                    updateTrackLists();
                    return;
                }
                
                const filteredTracks = state.tracks.filter(track =>
                    track.title.toLowerCase().includes(query) ||
                    track.artist.toLowerCase().includes(query)
                );
                
                if (allContainer) {
                    allContainer.innerHTML = filteredTracks.map((track, index) => `
                        <div class="track-row" data-track-id="${track.id}" onclick="playTrackFromList(${index})">
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
            });
        }
        
        // Кнопки "Показать все"
        document.getElementById('loadPopular')?.addEventListener('click', () => {
            const popularTracks = [...state.tracks].sort((a, b) => (b.plays || 0) - (a.plays || 0));
            showAllTracks('Популярные треки', popularTracks);
        });
        
        document.getElementById('loadNew')?.addEventListener('click', () => {
            const newTracks = [...state.tracks].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            showAllTracks('Новинки', newTracks);
        });
        
        // Делаем функцию глобально доступной
        window.playTrackFromList = function(index) {
            playTrack(index);
        };
    }
    
    // Воспроизведение/пауза
    async function togglePlay() {
        if (!state.currentTrackId) {
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
    
    // Показать все треки в модальном окне
    function showAllTracks(title, tracks) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="tracks-list">
                        ${tracks.map((track, index) => {
                            const trackIndex = state.tracks.indexOf(track);
                            return `
                                <div class="track-row" onclick="playTrackFromList(${trackIndex}); this.closest('.modal').classList.remove('active')">
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
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
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
    
    // Вспомогательные функции
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    
    function formatDuration(milliseconds) {
        const seconds = milliseconds / 1000;
        return formatTime(seconds);
    }
    
    function formatDate(timestamp) {
        if (!timestamp) return 'Дата неизвестна';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 86400000) return 'Сегодня';
        if (diff < 172800000) return 'Вчера';
        return date.toLocaleDateString('ru-RU');
    }
    
    // Инициализация
    init();
});
