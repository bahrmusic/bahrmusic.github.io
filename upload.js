document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const dropZone = document.getElementById('dropZone');
    const audioFileInput = document.getElementById('audioFileInput');
    const nextStep1Btn = document.getElementById('nextStep1');
    const backStep2Btn = document.getElementById('backStep2');
    const nextStep2Btn = document.getElementById('nextStep2');
    const backStep3Btn = document.getElementById('backStep3');
    const publishBtn = document.getElementById('publishBtn');
    
    // Данные формы
    let formData = {
        audioFile: null,
        audioUrl: null,
        title: '',
        artist: '',
        genre: '',
        description: ''
    };
    
    // Настройка обработчиков событий
    dropZone.addEventListener('click', () => audioFileInput.click());
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '#1DB954';
    });
    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = '';
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = '';
        
        if (e.dataTransfer.files.length) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    
    audioFileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFile(e.target.files[0]);
        }
    });
    
    // Обработка файла
    function handleFile(file) {
        // Проверка типа файла
        if (!file.type.startsWith('audio/')) {
            alert('Пожалуйста, выберите аудиофайл');
            return;
        }
        
        // Проверка размера
        if (file.size > 50 * 1024 * 1024) {
            alert('Файл слишком большой. Максимальный размер: 50MB');
            return;
        }
        
        formData.audioFile = file;
        
        // Показать превью
        const previewSection = document.getElementById('audioPreview');
        const previewFileName = document.getElementById('previewFileName');
        const previewFileSize = document.getElementById('previewFileSize');
        const previewAudio = document.getElementById('previewAudio');
        
        previewFileName.textContent = file.name;
        previewFileSize.textContent = formatFileSize(file.size);
        
        const audioUrl = URL.createObjectURL(file);
        previewAudio.src = audioUrl;
        
        previewSection.style.display = 'block';
    }
    
    // Навигация по шагам
    nextStep1Btn.addEventListener('click', () => {
        if (!formData.audioFile) {
            alert('Пожалуйста, выберите аудиофайл');
            return;
        }
        changeStep(1, 2);
    });
    
    backStep2Btn.addEventListener('click', () => changeStep(2, 1));
    
    nextStep2Btn.addEventListener('click', () => {
        const title = document.getElementById('trackTitle').value.trim();
        const artist = document.getElementById('artistName').value.trim();
        
        if (!title) {
            alert('Введите название трека');
            return;
        }
        
        if (!artist) {
            alert('Введите имя исполнителя');
            return;
        }
        
        formData.title = title;
        formData.artist = artist;
        formData.genre = document.getElementById('genre').value;
        formData.description = document.getElementById('trackDescription').value.trim();
        
        // Обновить сводку
        document.getElementById('summaryTitle').textContent = formData.title;
        document.getElementById('summaryArtist').textContent = formData.artist;
        document.getElementById('summaryGenre').textContent = formData.genre || 'Не указан';
        document.getElementById('summarySize').textContent = formatFileSize(formData.audioFile.size);
        
        changeStep(2, 3);
    });
    
    backStep3Btn.addEventListener('click', () => changeStep(3, 2));
    
    // Публикация трека
    publishBtn.addEventListener('click', async function() {
        // Блокируем кнопку
        this.disabled = true;
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Публикация...';
        
        const statusDiv = document.getElementById('uploadStatus');
        statusDiv.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Загрузка файла...</p>';
        statusDiv.className = 'upload-status processing';
        statusDiv.style.display = 'block';
        
        try {
            // 1. Загружаем файл на хостинг
            const audioUrl = await uploadToHosting(formData.audioFile);
            
            // 2. Сохраняем данные в Firebase
            const trackData = {
                title: formData.title,
                artist: formData.artist,
                audioUrl: audioUrl,
                genre: formData.genre,
                description: formData.description,
                duration: 0, // Можно добавить позже
                timestamp: Date.now(),
                plays: 0,
                likes: 0,
                uploaderId: getUserId()
            };
            
            const result = await dbHelpers.addTrack(trackData);
            
            // 3. Показываем успех
            statusDiv.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: #1DB954; margin-bottom: 15px;"></i>
                    <h3>Трек опубликован!</h3>
                    <p>Ссылка на трек: <a href="index.html?id=${result.id}" target="_blank">${trackData.title}</a></p>
                    <div style="margin-top: 20px;">
                        <button onclick="window.location.href='index.html?id=${result.id}'" class="btn-primary" style="margin-right: 10px;">
                            <i class="fas fa-play"></i> Слушать
                        </button>
                        <button onclick="window.location.href='upload.html'" class="btn-secondary">
                            <i class="fas fa-plus"></i> Загрузить ещё
                        </button>
                    </div>
                </div>
            `;
            statusDiv.className = 'upload-status success';
            
            // Очищаем форму
            resetForm();
            
        } catch (error) {
            console.error('Ошибка:', error);
            statusDiv.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 15px;"></i>
                    <h3>Ошибка загрузки</h3>
                    <p>${error.message || 'Неизвестная ошибка'}</p>
                    <button onclick="location.reload()" class="btn-secondary" style="margin-top: 15px;">
                        Попробовать снова
                    </button>
                </div>
            `;
            statusDiv.className = 'upload-status error';
        } finally {
            // Разблокируем кнопку
            this.disabled = false;
            this.innerHTML = '<i class="fas fa-paper-plane"></i> Опубликовать трек';
        }
    });
    
    // Загрузка файла на хостинг
    async function uploadToHosting(file) {
        const formDataObj = new FormData();
        formDataObj.append('file', file, file.name);
        
        const response = await fetch('https://yyf.mubilop.com/api/upload', {
            method: 'POST',
            body: formDataObj
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки файла');
        }
        
        const data = await response.json();
        return 'https://yyf.mubilop.com' + data.fileUrl;
    }
    
    // Смена шагов
    function changeStep(from, to) {
        // Обновить индикаторы
        document.querySelectorAll('.step').forEach((step, index) => {
            step.classList.toggle('active', index === to - 1);
        });
        
        // Показать/скрыть контент
        document.querySelectorAll('.step-content').forEach((content, index) => {
            content.classList.toggle('active', index === to - 1);
        });
    }
    
    // Сброс формы
    function resetForm() {
        formData = {
            audioFile: null,
            audioUrl: null,
            title: '',
            artist: '',
            genre: '',
            description: ''
        };
        
        document.getElementById('trackTitle').value = '';
        document.getElementById('artistName').value = '';
        document.getElementById('genre').value = '';
        document.getElementById('trackDescription').value = '';
        document.getElementById('audioPreview').style.display = 'none';
        audioFileInput.value = '';
        
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
});
