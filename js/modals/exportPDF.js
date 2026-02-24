// ========== exportPDF.js ==========
console.log('📄 exportPDF.js загружен');

// Функция открытия модального окна
window.openExportPDFModal = function() {
    console.log('📄 Открытие модалки экспорта PDF');
    const modal = document.getElementById('export-pdf-wrapper');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        console.error('❌ Модальное окно export-pdf-wrapper не найдено');
    }
};

// Функция закрытия модального окна
window.closeModal = function(modalId) {
    console.log(`📄 Закрытие модалки: ${modalId}`);
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
};

// Создаем временный контейнер для отчета
function createReportHTML(settings, data) {
    console.log('📄 Создание HTML для отчета...');
    
    let projects = data.projects;
    let tasks = data.tasks;
    
    if (settings.usePeriod && window.currentPeriod) {
        const start = new Date(window.currentPeriod.start);
        const end = new Date(window.currentPeriod.end);
        end.setHours(23, 59, 59);
        
        projects = projects.filter(p => {
            if (!p.createdAt) return true;
            const date = new Date(p.createdAt);
            return date >= start && date <= end;
        });
        
        tasks = tasks.filter(t => {
            if (!t.createdAt) return true;
            const date = new Date(t.createdAt);
            return date >= start && date <= end;
        });
    }
    
    const now = new Date();
    const overdueTasks = tasks.filter(t => t.deadline && t.status !== 2 && new Date(t.deadline) < now).length;
    
    // Статусы проектов
    const planning = projects.filter(p => p.status === 0).length;
    const inProgress = projects.filter(p => p.status === 1).length;
    const completed = projects.filter(p => p.status === 2).length;
    const totalProjects = planning + inProgress + completed;
    
    // Приоритеты задач
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
    
    const totalTasks = high + medium + low;
    
    // Месячная динамика
    const months = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь'];
    const monthlyCounts = {};
    tasks.forEach(task => {
        if (task.createdAt) {
            const date = new Date(task.createdAt);
            const month = date.getMonth();
            if (month < 6) {
                monthlyCounts[month] = (monthlyCounts[month] || 0) + 1;
            }
        }
    });
    
    // Создаем HTML
    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    color: #333;
                }
                h1 {
                    color: #2c3e50;
                    border-bottom: 2px solid #3498db;
                    padding-bottom: 10px;
                }
                h2 {
                    color: #34495e;
                    margin-top: 25px;
                    border-left: 4px solid #3498db;
                    padding-left: 10px;
                }
                .header-info {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 5px;
                    margin-bottom: 20px;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 15px;
                    margin: 20px 0;
                }
                .stat-card {
                    background: #fff;
                    border: 1px solid #dee2e6;
                    border-radius: 5px;
                    padding: 15px;
                }
                .stat-label {
                    color: #7f8c8d;
                    font-size: 14px;
                }
                .stat-value {
                    color: #2c3e50;
                    font-size: 24px;
                    font-weight: bold;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                }
                th {
                    background: #3498db;
                    color: white;
                    padding: 10px;
                    text-align: left;
                }
                td {
                    padding: 10px;
                    border-bottom: 1px solid #dee2e6;
                }
                .task-item {
                    padding: 8px 0;
                    border-bottom: 1px solid #eee;
                }
                .footer {
                    margin-top: 30px;
                    text-align: center;
                    color: #95a5a6;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <h1>Отчет по проектам и задачам</h1>
            
            <div class="header-info">
                <p><strong>Дата формирования:</strong> ${new Date().toLocaleDateString('ru-RU', {day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'})}</p>
                ${settings.usePeriod && window.currentPeriod ? 
                    `<p><strong>Период:</strong> ${window.currentPeriod.start} - ${window.currentPeriod.end}</p>` : ''}
            </div>
    `;
    
    if (settings.includeSummary) {
        html += `
            <h2>Сводная статистика</h2>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Всего проектов</div>
                    <div class="stat-value">${projects.length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Завершенные проекты</div>
                    <div class="stat-value">${projects.filter(p => p.status === 2).length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Активные задачи</div>
                    <div class="stat-value">${tasks.filter(t => t.status !== 2).length}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Просроченные задачи</div>
                    <div class="stat-value">${overdueTasks}</div>
                </div>
            </div>
        `;
    }
    
    if (settings.sections.projectsStatus) {
        html += `
            <h2>Статусы проектов</h2>
            <table>
                <thead>
                    <tr><th>Статус</th><th>Количество</th><th>Процент</th></tr>
                </thead>
                <tbody>
                    <tr><td>Планирование</td><td>${planning}</td><td>${totalProjects ? Math.round(planning/totalProjects*100) : 0}%</td></tr>
                    <tr><td>В работе</td><td>${inProgress}</td><td>${totalProjects ? Math.round(inProgress/totalProjects*100) : 0}%</td></tr>
                    <tr><td>Завершено</td><td>${completed}</td><td>${totalProjects ? Math.round(completed/totalProjects*100) : 0}%</td></tr>
                </tbody>
            </table>
        `;
    }
    
    if (settings.sections.priorityDistribution) {
        html += `
            <h2>Приоритеты задач</h2>
            <table>
                <thead>
                    <tr><th>Приоритет</th><th>Количество</th><th>Процент</th></tr>
                </thead>
                <tbody>
                    <tr><td>Высокий</td><td>${high}</td><td>${totalTasks ? Math.round(high/totalTasks*100) : 0}%</td></tr>
                    <tr><td>Средний</td><td>${medium}</td><td>${totalTasks ? Math.round(medium/totalTasks*100) : 0}%</td></tr>
                    <tr><td>Низкий</td><td>${low}</td><td>${totalTasks ? Math.round(low/totalTasks*100) : 0}%</td></tr>
                </tbody>
            </table>
        `;
    }
    
    if (settings.sections.monthlyTasks) {
        html += `<h2>Динамика по месяцам</h2><table><thead><tr><th>Месяц</th><th>Количество задач</th></tr></thead><tbody>`;
        for (let i = 0; i < 6; i++) {
            html += `<tr><td>${months[i]}</td><td>${monthlyCounts[i] || 0}</td></tr>`;
        }
        html += `</tbody></table>`;
    }
    
    if (settings.sections.detailedTasks) {
        html += `<h2>Последние задачи</h2><div>`;
        const sortedTasks = [...tasks]
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 10);
        
        sortedTasks.forEach(task => {
            const deadline = task.deadline ? new Date(task.deadline).toLocaleDateString('ru-RU') : 'без срока';
            html += `<div class="task-item">• ${task.name || 'Без названия'} (до ${deadline})</div>`;
        });
        html += `</div>`;
    }
    
    html += `
            <div class="footer">Отчет сгенерирован автоматически</div>
        </body>
        </html>
    `;
    
    return html;
}

// Обработчик экспорта PDF
window.handleExportPDF = async function(event) {
    event.preventDefault();
    console.log('📄 Начинаем экспорт PDF...');
    
    // Собираем настройки экспорта
    const exportSettings = {
        sections: {
            projectsStatus: document.getElementById('export-projects-status')?.checked || false,
            priorityDistribution: document.getElementById('export-priority-distribution')?.checked || false,
            monthlyTasks: document.getElementById('export-monthly-tasks')?.checked || false,
            detailedTasks: document.getElementById('export-detailed-tasks')?.checked || false
        },
        orientation: document.querySelector('input[name="page-orientation"]:checked')?.value || 'portrait',
        usePeriod: document.getElementById('export-use-period')?.checked || false,
        sortBy: document.getElementById('export-sort')?.value || 'priority',
        includeSummary: document.getElementById('export-include-summary')?.checked || false
    };
    
    console.log('📄 Настройки экспорта:', exportSettings);
    
    // Показываем индикатор загрузки
    const submitBtn = event.target.querySelector('.btn-primary');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Формирование...';
    submitBtn.disabled = true;
    
    try {
        // Проверяем данные
        if (!window.reportsData) {
            throw new Error('Данные отчетов не загружены');
        }
        
        // Создаем HTML отчет
        const reportHTML = createReportHTML(exportSettings, window.reportsData);
        
        // Создаем blob и скачиваем как HTML
        const blob = new Blob([reportHTML], { type: 'text/html;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report-${new Date().toISOString().split('T')[0]}.html`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Показываем сообщение
        if (window.showToast) {
            window.showToast('✅ HTML отчет успешно сформирован', 'success');
        }
        
        closeModal('export-pdf-wrapper');
        
    } catch (error) {
        console.error('❌ Ошибка:', error);
        if (window.showToast) {
            window.showToast('❌ Ошибка: ' + error.message, 'error');
        }
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
};

// Инициализация
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 exportPDF.js: DOM загружен');
    
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal('export-pdf-wrapper');
        }
    });
    
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('export-pdf-wrapper');
        if (e.target === modal) {
            closeModal('export-pdf-wrapper');
        }
    });
});