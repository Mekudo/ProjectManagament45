// ========== ПОЛНОСТЬЮ ИСПРАВЛЕННЫЙ СКРИПТ ДЛЯ СТРАНИЦЫ ОТЧЕТОВ ==========

console.log('🚀 СКРИПТ REPORTS.JS ЗАПУЩЕН');

// Глобальные переменные
window.reportsData = {
    projects: [],
    tasks: []
};

window.currentPeriod = {
    start: getDefaultStartDate(),
    end: getDefaultEndDate()
};
// Локальная переменная для удобства (можно оставить)
let reportsData = window.reportsData;
let currentPeriod = window.currentPeriod;
// ========== ЗАГРУЗКА ДАННЫХ ==========

// Загрузка всех данных
async function loadAllData() {
    console.log('📡 ЗАГРУЗКА ДАННЫХ...');
    showLoading(true);
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('❌ Нет токена');
            showToast('Ошибка авторизации', 'error');
            return;
        }

        // Загружаем проекты
        console.log('📁 Загрузка проектов...');
        const projectsRes = await fetch('https://dmitrii-golubev.ru:7000/api/project/all', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const projects = await projectsRes.json();
        console.log('✅ Проекты загружены:', projects.length);
        
        // Загружаем задачи
        console.log('📋 Загрузка задач...');
        const tasksRes = await fetch('https://dmitrii-golubev.ru:7000/api/task/all', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const tasks = await tasksRes.json();
        console.log('✅ Задачи загружены:', tasks.length);

        // СОХРАНЯЕМ В ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
        window.reportsData = {
            projects: projects || [],
            tasks: tasks || []
        };
        
        // Также сохраняем в локальную переменную если нужно
        reportsData = window.reportsData;
        
        console.log('✅ window.reportsData:', window.reportsData);

        // Обновляем все блоки
        updateAllReports();
        showToast('Данные успешно загружены', 'success');

    } catch (error) {
        console.error('❌ Ошибка:', error);
        showToast('Ошибка загрузки: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}
// Функция фильтрации данных по периоду
function filterDataByPeriod() {
    console.log('📊 Фильтрация данных по периоду:', window.currentPeriod);
    
    // Если период не задан, возвращаем все данные
    if (!window.currentPeriod || !window.currentPeriod.start || !window.currentPeriod.end) {
        console.log('📊 Период не задан, используем все данные');
        return {
            projects: window.reportsData.projects || [],
            tasks: window.reportsData.tasks || []
        };
    }
    
    const start = new Date(window.currentPeriod.start);
    const end = new Date(window.currentPeriod.end);
    end.setHours(23, 59, 59, 999); // Включаем весь последний день
    
    console.log('📊 Фильтр с:', start.toLocaleDateString(), 'по:', end.toLocaleDateString());
    
    const filteredProjects = (window.reportsData.projects || []).filter(project => {
        if (!project.createdAt) return true; // Если даты нет, оставляем
        const projectDate = new Date(project.createdAt);
        return projectDate >= start && projectDate <= end;
    });
    
    const filteredTasks = (window.reportsData.tasks || []).filter(task => {
        if (!task.createdAt) return true; // Если даты нет, оставляем
        const taskDate = new Date(task.createdAt);
        return taskDate >= start && taskDate <= end;
    });
    
    console.log('📊 Результат фильтрации:', {
        projects: filteredProjects.length,
        tasks: filteredTasks.length,
        originalProjects: window.reportsData.projects?.length || 0,
        originalTasks: window.reportsData.tasks?.length || 0
    });
    
    return {
        projects: filteredProjects,
        tasks: filteredTasks
    };
}
// ========== ОБНОВЛЕНИЕ ВСЕХ ОТЧЕТОВ ==========

function updateAllReports() {
    console.log('🔄 ОБНОВЛЕНИЕ ВСЕХ ОТЧЕТОВ...');
    updateKPI();
    updateProjectsStatus();
    updatePieChart();
    updateTasksPriority();
    updateMonthlyDynamics();
    updateRecentTasks();
    
    // Проверка через секунду
    setTimeout(checkUpdates, 1000);
}

// ========== 1. KPI КАРТОЧКИ ==========

// 1. ОБНОВЛЕНИЕ KPI
function updateKPI() {
    console.log('📊 Обновление KPI...');
    
    const filtered = filterDataByPeriod();
    const projects = filtered.projects;
    const tasks = filtered.tasks;
    
    // Статистика
    const totalProjects = projects.length;
    const completedProjects = projects.filter(p => p.status === 2).length;
    const activeTasks = tasks.filter(t => t.status !== 2).length;
    
    const now = new Date();
    const overdueTasks = tasks.filter(t => {
        if (!t.deadline || t.status === 2) return false;
        return new Date(t.deadline) < now;
    }).length;

    console.log('📊 KPI данные:', {totalProjects, completedProjects, activeTasks, overdueTasks});

    // Обновляем карточки
    const kpiCards = document.querySelectorAll('.kpi-card');
    
    if (kpiCards.length >= 4) {
        kpiCards[0].querySelector('.kpi-value').textContent = totalProjects;
        kpiCards[1].querySelector('.kpi-value').textContent = completedProjects;
        kpiCards[2].querySelector('.kpi-value').textContent = activeTasks;
        kpiCards[3].querySelector('.kpi-value').textContent = overdueTasks;
        
        // Если нет данных, показываем 0 (уже сделано выше)
        console.log('✅ KPI обновлены');
    }
}

// ========== 2. СТАТУСЫ ПРОЕКТОВ (ЛЕГЕНДА) ==========

// 2. СТАТУСЫ ПРОЕКТОВ
function updateProjectsStatus() {
    console.log('📊 Обновление статусов проектов...');
    
    const filtered = filterDataByPeriod();
    const projects = filtered.projects;
    
    const planning = projects.filter(p => p.status === 0).length;
    const inProgress = projects.filter(p => p.status === 1).length;
    const completed = projects.filter(p => p.status === 2).length;

    console.log('📊 Статусы:', {planning, inProgress, completed});

    const legendContainer = document.getElementById('projects-legend');
    if (legendContainer) {
        legendContainer.innerHTML = `
            <div><span class="legend-color" style="background: #3498db;"></span> Планирование (${planning})</div>
            <div><span class="legend-color" style="background: #f39c12;"></span> В работе (${inProgress})</div>
            <div><span class="legend-color" style="background: #2ecc71;"></span> Завершено (${completed})</div>
        `;
        console.log('✅ Легенда обновлена');
    }
}

// ========== 3. КРУГОВАЯ ДИАГРАММА ==========

// 3. КРУГОВАЯ ДИАГРАММА
function updatePieChart() {
    console.log('📊 Обновление круговой диаграммы...');
    
    const filtered = filterDataByPeriod();
    const projects = filtered.projects;
    
    const planning = projects.filter(p => p.status === 0).length;
    const inProgress = projects.filter(p => p.status === 1).length;
    const completed = projects.filter(p => p.status === 2).length;
    
    const total = planning + inProgress + completed;
    
    const pieContainer = document.querySelector('.pie-chart');
    if (!pieContainer) {
        console.log('❌ Контейнер .pie-chart не найден');
        return;
    }
    
    if (total === 0) {
        // Если нет данных, показываем серый круг
        pieContainer.style.background = '#e0e0e0';
        console.log('⚠️ Нет данных за период');
        return;
    }
    
    // Рассчитываем проценты
    const planningPercent = (planning / total) * 100;
    const inProgressPercent = (inProgress / total) * 100;
    const completedPercent = (completed / total) * 100;
    
    // Применяем градиент
    pieContainer.style.background = `conic-gradient(
        #3498db 0% ${planningPercent}%,
        #f39c12 ${planningPercent}% ${planningPercent + inProgressPercent}%,
        #2ecc71 ${planningPercent + inProgressPercent}% 100%
    )`;
    
    console.log('✅ Круговая диаграмма обновлена');
}

// ========== 4. ПРИОРИТЕТЫ ЗАДАЧ ==========

function updateTasksPriority() {
    console.log('📊 Обновление приоритетов задач...');
    
    const tasks = reportsData.tasks;
    
    const high = tasks.filter(t => {
        const p = String(t.priority || '').toLowerCase();
        return p === 'high' || p === 'высокий' || p === '1';
    }).length;
    
    const medium = tasks.filter(t => {
        const p = String(t.priority || '').toLowerCase();
        return p === 'medium' || p === 'средний' || p === '2';
    }).length;
    
    const low = tasks.filter(t => {
        const p = String(t.priority || '').toLowerCase();
        return p === 'low' || p === 'низкий' || p === '3';
    }).length;

    const total = high + medium + low;
    console.log('📊 Приоритеты:', {high, medium, low, total});

    const barItems = document.querySelectorAll('.bar-item');
    
    if (barItems.length >= 3) {
        // Высокий
        const bar1 = barItems[0].querySelector('.bar-fill');
        bar1.style.width = total ? (high / total) * 100 + '%' : '0%';
        bar1.textContent = high;
        bar1.style.background = '#e74c3c';
        
        // Средний
        const bar2 = barItems[1].querySelector('.bar-fill');
        bar2.style.width = total ? (medium / total) * 100 + '%' : '0%';
        bar2.textContent = medium;
        bar2.style.background = '#f39c12';
        
        // Низкий
        const bar3 = barItems[2].querySelector('.bar-fill');
        bar3.style.width = total ? (low / total) * 100 + '%' : '0%';
        bar3.textContent = low;
        bar3.style.background = '#2ecc71';
    }

    const totalElement = document.getElementById('tasks-total');
    if (totalElement) {
        totalElement.textContent = `Всего задач: ${total}`;
    }
    
    console.log('✅ Приоритеты обновлены');
}

// ========== 5. МЕСЯЧНАЯ ДИНАМИКА ==========

// 4. МЕСЯЧНАЯ ДИНАМИКА
function updateMonthlyDynamics() {
    console.log('📊 Обновление месячной динамики...');
    
    const filtered = filterDataByPeriod();
    const tasks = filtered.tasks;
    
    const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
    
    // Группировка по месяцам
    const monthlyCounts = {};
    tasks.forEach(task => {
        if (task.createdAt) {
            const date = new Date(task.createdAt);
            const month = date.getMonth();
            monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
        }
    });

    // Находим максимум для масштабирования
    const maxValue = Math.max(...Object.values(monthlyCounts), 1);

    const barsContainer = document.getElementById('monthly-bars');
    if (!barsContainer) return;
    
    barsContainer.innerHTML = '';
    
    if (tasks.length === 0) {
        // Если нет задач, показываем пустой график
        for (let i = 0; i < 6; i++) {
            const bar = document.createElement('div');
            bar.className = 'line-bar';
            bar.style.height = '5px';
            bar.innerHTML = `<span>${months[i]}</span>`;
            bar.title = '0 задач';
            barsContainer.appendChild(bar);
        }
        console.log('⚠️ Нет данных для графика');
        return;
    }
    
    for (let i = 0; i < 6; i++) {
        const value = monthlyCounts[i] || 0;
        const height = (value / maxValue) * 100;
        
        const bar = document.createElement('div');
        bar.className = 'line-bar';
        bar.style.height = height + 'px';
        bar.innerHTML = `<span>${months[i]}</span>`;
        bar.title = `${value} задач`;
        barsContainer.appendChild(bar);
    }
    
    console.log('✅ Месячная динамика обновлена');
}

// ========== 6. ПОСЛЕДНИЕ ЗАДАЧИ ==========

// 5. ПОСЛЕДНИЕ ЗАДАЧИ
function updateRecentTasks() {
    console.log('📊 Обновление последних задач...');
    
    const filtered = filterDataByPeriod();
    const tasks = filtered.tasks;
    
    const taskList = document.getElementById('recent-tasks-list');
    if (!taskList) return;

    if (tasks.length === 0) {
        taskList.innerHTML = '<div class="no-tasks" style="text-align: center; padding: 20px; color: #999;">Нет задач за выбранный период</div>';
        console.log('⚠️ Нет задач за период');
        return;
    }

    // Берем последние 5 задач
    const recentTasks = [...tasks]
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
        .slice(0, 5);

    taskList.innerHTML = '';

    recentTasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = 'task-item';

        let priorityClass = 'medium';
        const priority = String(task.priority || '').toLowerCase();
        if (priority === 'high' || priority === 'высокий' || priority === '1') {
            priorityClass = 'high';
        } else if (priority === 'low' || priority === 'низкий' || priority === '3') {
            priorityClass = 'low';
        }

        let deadlineText = 'без срока';
        if (task.deadline) {
            const deadline = new Date(task.deadline);
            deadlineText = deadline.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit'
            });
        }

        taskItem.innerHTML = `
            <div class="task-priority ${priorityClass}"></div>
            <div class="task-info">
                <span class="task-name">${task.name || 'Без названия'}</span>
                <span class="task-deadline">до ${deadlineText}</span>
            </div>
        `;

        taskList.appendChild(taskItem);
    });
    
    console.log('✅ Последние задачи обновлены');
}

// ========== ПРОВЕРКА ОБНОВЛЕНИЙ ==========

function checkUpdates() {
    console.log('🔍 ПРОВЕРКА ОБНОВЛЕНИЙ:');
    console.log('KPI карточки:', document.querySelectorAll('.kpi-card .kpi-value').length);
    console.log('Первая KPI:', document.querySelector('.kpi-card .kpi-value')?.textContent);
    console.log('Легенда:', document.getElementById('projects-legend')?.children.length);
    console.log('Приоритеты:', document.querySelectorAll('.bar-fill').length);
    console.log('Месячные бары:', document.getElementById('monthly-bars')?.children.length);
    console.log('Список задач:', document.getElementById('recent-tasks-list')?.children.length);
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function getDefaultStartDate() {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
}

function getDefaultEndDate() {
    return new Date().toISOString().split('T')[0];
}

function showLoading(show) {
    let loader = document.getElementById('reports-loader');
    
    if (show) {
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'reports-loader';
            loader.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(255,255,255,0.8);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            `;
            loader.innerHTML = `
                <div style="
                    width: 50px;
                    height: 50px;
                    border: 5px solid #f3f3f3;
                    border-top: 5px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 10px;
                "></div>
                <div>Загрузка данных...</div>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            document.querySelector('.reports-container').appendChild(loader);
        }
    } else {
        if (loader) loader.remove();
    }
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.log('Toast:', message);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${type === 'success' ? '✅' : '❌'}</div>
        <div class="toast-content">
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
    `;

    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// ========== ФУНКЦИИ ДЛЯ МОДАЛЬНЫХ ОКОН ==========

window.openModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'flex';
};

window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
};

window.forceUpdateReports = loadAllData;

window.handleExportPDF = function(event) {
    event.preventDefault();
    showToast('Функция экспорта в разработке', 'info');
    closeModal('export-pdf-wrapper');
};

window.handleSelectPeriod = function(event) {
    event.preventDefault();
    
    const start = document.getElementById('period-start')?.value;
    const end = document.getElementById('period-end')?.value;
    
    if (start && end) {
        currentPeriod = { start, end };
        loadAllData();
        showToast(`Период: ${start} - ${end}`, 'success');
    }
    
    closeModal('select-period-wrapper');
};

// ========== ЗАПУСК СКРИПТА ==========

// Способ 1: Ждем загрузку DOM
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM загружен');
    if (document.querySelector('.reports-container')) {
        console.log('✅ Запуск loadAllData после DOMContentLoaded');
        setTimeout(loadAllData, 500);
    }
});

// Способ 2: Запасной вариант
setTimeout(() => {
    console.log('⏰ Запасной запуск через 2 секунды');
    if (typeof loadAllData === 'function') {
        loadAllData();
    }
}, 2000);

console.log('🏁 Скрипт полностью загружен');