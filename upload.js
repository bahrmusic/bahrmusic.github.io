document.addEventListener('DOMContentLoaded', function() {
    // Проверяем доступность dbHelpers
    if (typeof dbHelpers === 'undefined') {
        console.error('dbHelpers не определен. Проверьте загрузку firebase-config.js');
        
        // Показываем сообщение об ошибке
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <h4><i class="fas fa-exclamation-triangle"></i> Ошибка загрузки</h4>
            <p>Не удалось подключиться к базе данных. Пожалуйста, обновите страницу.</p>
        `;
        errorDiv.style.cssText = `
            background: rgba(220, 53, 69, 0.2);
            color: #dc3545;
            padding: 20px;
            border-radius: 10px;
            margin: 20px;
            border: 2px solid #dc3545;
            text-align: center;
        `;
        
        document.querySelector('.upload-main').prepend(errorDiv);
        return;
    }
    
    // Элементы DOM
    const dropZone = document.getElementById('dropZone');
    const audioFileInput = document.getElementById('audioFileInput');
    const nextStep1Btn = document.getElementById('nextStep1');
    const backStep2Btn = document.getElementById('backStep2');
    const nextStep2Btn = document.getElementById('nextStep2');
    const backStep3Btn = document.getElementById('backStep3');
    const publishBtn = document.getElementById('publishBtn');
    const uploadStatus = document.getElementById('uploadStatus');
    
    // Данные формы
    let formData = {
        audioFile: null,
        audioUrl: null,
        title: '',
        artist: '',
        genre: '',
        description: ''
    };
    
    // Инициализация
    function init() {
        console.log('Инициализация формы загрузки');
        console.log('dbHelpers доступен:', typeof dbHelpers !== 'undefined');
        setupEventListeners();
    }
    
    // Настройка обработчиков событий
    function setupEventListeners() {
        // Drag & Drop
        dropZone.addEventListener('click', () => audioFileInput.click());
        dropZone.addEventListener('dragover', handleDragOver);
        dropZone.addEventListener('dragleave', handleDragLeave);
        dropZone.addEventListener('drop', handleDrop);
        
        // Выбор файла
        audioFileInput.addEventListener('change', handleFileSelect);
        
        // Навигация по шагам
        nextStep1Btn.addEventListener('click', goToStep2);
        backStep2Btn.addEventListener('click', goToStep1);
        nextStep2Btn.addEventListener('click', goToStep3);
        backStep3Btn.addEventListener('click', goToStep2);
        publishBtn.addEventListener('click', publishTrack);
    }
    
    // Обработчики Drag & Drop
    function handleDragOver(e) {
        e.preventDefault();
        dropZone.style.borderColor = '#1DB954';
        dropZone.style.background = 'rgba(29, 185, 84, 0.1)';
    }
    
    function handleDragLeave(e) {
        e.preventDefault();
        dropZone.style.borderColor = '';
        dropZone.style.background = '';
    }
    
    function handleDrop(e) {
        e.preventDefault();
        dropZone.style.borderColor = '';
        dropZone.style.background = '';
        
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    }
    
    // Выбор файла
    function handleFileSelect(e) {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    }
    
    // Обработка файла
    function handleFile(file) {
        console.log('Выбран файл:', file.name, file.type, file.size);
        
        // Проверка типа файла
        if (!file.type.startsWith('audio/')) {
            showError('Пожалуйста, выберите аудиофайл (MP3, WAV, FLAC, M4A и др.)');
            return;
        }
        
        // Проверка размера (макс. 50MB)
        if (file.size > 50 * 1024 * 1024) {
            showError('Файл слишком большой. Максимальный размер: 50MB');
            return;
        }
        
        formData.audioFile = file;
        
        // Показать превью
        showAudioPreview(file);
    }
    
    // Показать превью аудио
    function showAudioPreview(file) {
        const previewSection = document.getElementById('audioPreview');
        const previewFileName = document.getElementById('previewFileName');
        const previewFileSize = document.getElementById('previewFileSize');
        const previewAudio = document.getElementById('previewAudio');
        
        // Обновить информацию
        previewFileName.textContent = file.name;
        previewFileSize.textContent = formatFileSize(file.size);
        
        // Создать URL для превью
        const audioUrl = URL.createObjectURL(file);
        previewAudio.src = audioUrl;
        
        // Загрузить метаданные для получения длительности
        previewAudio.onloadedmetadata = function() {
            formData.duration = previewAudio.duration * 1000; // в миллисекундах
            console.log('Длительность трека:', formData.duration, 'мс');
        };
        
        // Показать секцию
        previewSection.style.display = 'block';
        
        // Прокрутить к превью
        previewSection.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Переход к шагу 2
    function goToStep2() {
        if (!formData.audioFile) {
            showError('Пожалуйста, выберите аудиофайл');
            return;
        }
        
        changeStep(1, 2);
    }
    
    // Переход к шагу 1
    function goToStep1() {
        changeStep(2, 1);
    }
    
    // Переход к шагу 3
    function goToStep3() {
        // Валидация формы
        const title = document.getElementById('trackTitle').value.trim();
        const artist = document.getElementById('artistName').value.trim();
        
        if (!title) {
            showError('Введите название трека');
            return;
        }
        
        if (!artist) {
            showError('Введите имя исполнителя');
            return;
        }
        
        // Сохранить данные формы
        formData.title = title;
        formData.artist = artist;
        formData.genre = document.getElementById('genre').value;
        formData.description = document.getElementById('trackDescription').value.trim();
        
        // Обновить сводку
        updateSummary();
        
        changeStep(2, 3);
    }
    
    // Переход к шагу 2
    function goToStep2() {
        changeStep(3, 2);
    }
    
    // Изменить шаг
    function changeStep(from, to) {
        // Обновить индикаторы шагов
        document.querySelectorAll('.step').forEach((step, index) => {
            step.classList.toggle('active', index === to - 1);
        });
        
        // Показать/скрыть контент шагов
        document.querySelectorAll('.step-content').forEach((content, index) => {
            content.classList.toggle('active', index === to - 1);
        });
        
        // Прокрутить к началу
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    // Обновить сводку
    function updateSummary() {
        document.getElementById('summaryTitle').textContent = formData.title;
        document.getElementById('summaryArtist').textContent = formData.artist;
        document.getElementById('summaryGenre').textContent = formData.genre || 'Не указан';
        document.getElementById('summarySize').textContent = formatFileSize(formData.audioFile.size);
    }
    
    // Опубликовать трек
    async function publishTrack() {
        console.log('Начало публикации трека...');
        
        // Блокируем кнопку
        publishBtn.disabled = true;
        publishBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Публикация...';
        
        // Показать статус загрузки
        showUploadStatus('processing', 'Загрузка аудиофайла...');
        
        try {
            // 1. Загрузить аудиофайл на хостинг
            console.log('Загрузка файла на хостинг...');
            const audioUrl = await uploadToHosting(formData.audioFile);
            formData.audioUrl = audioUrl;
            console.log('Файл загружен, URL:', audioUrl);
            
            // 2. Сохранить данные трека в Firebase
            console.log('Сохранение данных в Firebase...');
            const trackData = {
                title: formData.title,
                artist: formData.artist,
                audioUrl: audioUrl,
                genre: formData.genre,
                description: formData.description,
                duration: formData.duration || 0,
                timestamp: Date.now(),
                plays: 0,
                likes: 0,
                uploaderId: getUserId()
            };
            
            console.log('Данные трека:', trackData);
            
            const result = await dbHelpers.addTrack(trackData);
            console.log('Трек сохранен, ID:', result.id);
            
            // 3. Показать успех
            showUploadStatus('success', `
                <h4><i class="fas fa-check-circle"></i> Трек успешно опубликован!</h4>
                <p>Теперь он доступен для всех пользователей BAHR MUSIC.</p>
                <div class="success-actions">
                    <button onclick="window.location.href='index.html?id=${result.id}'" class="btn-primary">
                        <i class="fas fa-play"></i> Слушать трек
                    </button>
                    <button onclick="window.location.href='upload.html'" class="btn-secondary">
                        <i class="fas fa-plus"></i> Загрузить ещё
                    </button>
                </div>
            `);
            
            // Очистить форму
            resetForm();
            
        } catch (error) {
            console.error('Ошибка публикации:', error);
            showUploadStatus('error', `
                <h4><i class="fas fa-exclamation-circle"></i> Ошибка публикации</h4>
                <p>${error.message || 'Неизвестная ошибка'}</p>
                <button onclick="location.reload()" class="btn-secondary">Попробовать снова</button>
            `);
        } finally {
            // Разблокировать кнопку
            publishBtn.disabled = false;
            publishBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Опубликовать трек';
        }
    }
    
    // Загрузить файл на хостинг (используя твой API)
    async function uploadToHosting(file) {
        console.log('Начало загрузки файла:', file.name, file.size);
        
        const formDataObj = new FormData();
        formDataObj.append('file', file, file.name);
        
        const response = await fetch('https://yyf.mubilop.com/api/upload', {
            method: 'POST',
            body: formDataObj
        });
        
        console.log('Ответ от сервера:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка сервера:', errorText);
            throw new Error(`Ошибка загрузки файла: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Данные от сервера:', data);
        
        if (!data.fileUrl) {
            throw new Error('Сервер не вернул ссылку на файл');
        }
        
        return 'https://yyf.mubilop.com' + data.fileUrl;
    }
    
    // Показать статус загрузки
    function showUploadStatus(type, html) {
        uploadStatus.className = `upload-status ${type}`;
        uploadStatus.innerHTML = html;
        uploadStatus.style.display = 'block';
        
        uploadStatus.scrollIntoView({ behavior: 'smooth' });
    }
    
    // Показать ошибку
    function showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorDiv.style.cssText = `
            background: rgba(220, 53, 69, 0.1);
            color: #dc3545;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            border-left: 4px solid #dc3545;
        `;
        
        // Вставить в начало формы
        const form = document.querySelector('.upload-form');
        form.insertBefore(errorDiv, form.firstChild);
        
        // Автоудаление через 5 секунд
        setTimeout(() => errorDiv.remove(), 5000);
    }
    
    // Сбросить форму
    function resetForm() {
        formData = {
            audioFile: null,
            audioUrl: null,
            title: '',
            artist: '',
            genre: '',
            description: ''
        };
        
        // Сбросить поля формы
        document.getElementById('trackTitle').value = '';
        document.getElementById('artistName').value = '';
        document.getElementById('genre').value = '';
        document.getElementById('trackDescription').value = '';
        
        // Скрыть превью
        document.getElementById('audioPreview').style.display = 'none';
        
        // Сбросить input файла
        audioFileInput.value = '';
        
        // Вернуться к шагу 1
        changeStep(3, 1);
    }
    
    // Форматирование размера файла
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Инициализировать
    init();
});
