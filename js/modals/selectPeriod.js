// ========== selectPeriod.js ==========
console.log('📅 selectPeriod.js загружен');

// Функция открытия модального окна
window.openSelectPeriodModal = function() {
    console.log('📅 Открытие модалки выбора периода');
    const modal = document.getElementById('select-period-wrapper');
    if (modal) {
        modal.style.display = 'flex';
        
        // Устанавливаем текущие значения периода
        if (window.currentPeriod) {
            document.getElementById('period-start').value = window.currentPeriod.start || '';
            document.getElementById('period-end').value = window.currentPeriod.end || '';
        }
    } else {
        console.error('❌ Модальное окно select-period-wrapper не найдено');
    }
};

// Функция закрытия модального окна
window.closeModal = function(modalId) {
    console.log(`📅 Закрытие модалки: ${modalId}`);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};

// Форматирование даты
function formatDate(date) {
    const d = new Date(date);
    let month = '' + (d.getMonth() + 1);
    let day = '' + d.getDate();
    const year = d.getFullYear();
    
    if (month.length < 2) month = '0' + month;
    if (day.length < 2) day = '0' + day;
    
    return [year, month, day].join('-');
}

// Переключение полей в зависимости от типа периода
window.toggleCustomPeriod = function() {
    const type = document.getElementById('period-type').value;
    
    document.getElementById('custom-period-fields').style.display = type === 'custom' ? 'block' : 'none';
    document.getElementById('month-select-fields').style.display = type === 'month' ? 'block' : 'none';
    document.getElementById('quarter-select-fields').style.display = type === 'quarter' ? 'block' : 'none';
    document.getElementById('year-select-fields').style.display = type === 'year' ? 'block' : 'none';
};

// Быстрый выбор периода
window.setQuickPeriod = function(period) {
    console.log('📅 Быстрый выбор:', period);
    
    const today = new Date();
    let startDate = new Date();
    let endDate = new Date();
    
    switch(period) {
        case 'today':
            startDate = today;
            endDate = today;
            break;
        case 'week':
            startDate = new Date(today.setDate(today.getDate() - 7));
            endDate = new Date();
            break;
        case 'month':
            startDate = new Date(today.setMonth(today.getMonth() - 1));
            endDate = new Date();
            break;
        case 'quarter':
            startDate = new Date(today.setMonth(today.getMonth() - 3));
            endDate = new Date();
            break;
        case 'year':
            startDate = new Date(today.setFullYear(today.getFullYear() - 1));
            endDate = new Date();
            break;
    }
    
    document.getElementById('period-start').value = formatDate(startDate);
    document.getElementById('period-end').value = formatDate(endDate);
    document.getElementById('period-type').value = 'custom';
    toggleCustomPeriod();
};

// Обработчик выбора периода
window.handleSelectPeriod = function(event) {
    event.preventDefault();
    console.log('📅 Применение периода...');
    
    const submitBtn = event.target.querySelector('.btn-primary');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Применение...';
    submitBtn.disabled = true;
    
    try {
        let startDate = document.getElementById('period-start').value;
        let endDate = document.getElementById('period-end').value;
        const periodType = document.getElementById('period-type').value;
        
        // Если выбран не произвольный период, вычисляем даты
        if (periodType !== 'custom') {
            const today = new Date();
            switch(periodType) {
                case 'month':
                    const month = document.getElementById('select-month').value;
                    startDate = formatDate(new Date(today.getFullYear(), month - 1, 1));
                    endDate = formatDate(new Date(today.getFullYear(), month, 0));
                    break;
                case 'quarter':
                    const quarter = document.getElementById('select-quarter').value;
                    const quarterStartMonth = (quarter - 1) * 3;
                    startDate = formatDate(new Date(today.getFullYear(), quarterStartMonth, 1));
                    endDate = formatDate(new Date(today.getFullYear(), quarterStartMonth + 3, 0));
                    break;
                case 'year':
                    const year = document.getElementById('select-year').value;
                    startDate = formatDate(new Date(year, 0, 1));
                    endDate = formatDate(new Date(year, 11, 31));
                    break;
            }
        }
        
        // Проверяем корректность дат
        if (!startDate || !endDate) {
            throw new Error('Выберите начальную и конечную даты');
        }
        
        if (new Date(startDate) > new Date(endDate)) {
            throw new Error('Дата начала не может быть позже даты окончания');
        }
        
        console.log('📅 Выбранный период:', { start: startDate, end: endDate });
        
        // Сохраняем период
        if (window.currentPeriod) {
            window.currentPeriod = {
                start: startDate,
                end: endDate
            };
            console.log('📅 currentPeriod обновлен:', window.currentPeriod);
        }
        
        // Загружаем данные с новым периодом
        if (typeof window.loadAllData === 'function') {
            window.loadAllData();
        } else if (typeof loadAllData === 'function') {
            loadAllData();
        }
        
        // Показываем сообщение
        const message = `Период применен: ${startDate} - ${endDate}`;
        if (window.showToast) {
            window.showToast('✅ ' + message, 'success');
        }
        
        closeModal('select-period-wrapper');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        if (window.showToast) {
            window.showToast('❌ ' + error.message, 'error');
        } else {
            alert('❌ ' + error.message);
        }
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    console.log('📅 selectPeriod.js: DOM загружен');
    
    // Заполняем список годов
    const yearSelect = document.getElementById('select-year');
    if (yearSelect) {
        const currentYear = new Date().getFullYear();
        for (let year = currentYear - 5; year <= currentYear + 2; year++) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            if (year === currentYear) option.selected = true;
            yearSelect.appendChild(option);
        }
    }
    
    // Закрытие по Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal('select-period-wrapper');
        }
    });
    
    // Закрытие по клику вне модалки
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('select-period-wrapper');
        if (e.target === modal) {
            closeModal('select-period-wrapper');
        }
    });
});