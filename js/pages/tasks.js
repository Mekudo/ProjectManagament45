
// Глобальные переменные для страницы задач
let allTasks = [];
let filteredTasks = [];
let projects = [];
let projectStatuses = {};
let projectExecutors = {};
let usersCache = {};
let currentSelectedProjectId = null;
let currentTaskProjectForTasks = null;

// Функция инициализации страницы задач
function initTasksPage() {
    
    // Очищаем старые данные
    allTasks = [];
    filteredTasks = [];
    
    const tbody = document.getElementById('tasksTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr class="loading-row">
                <td colspan="6" class="loading-cell">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Загрузка задач...</span>
                    </div>
                </td>
            </tr>
        `;
        loadProjectsForTasks();
    } else {
        console.error('❌ tasksTableBody НЕ НАЙДЕН в initTasksPage');
        setTimeout(() => {
            const retryTbody = document.getElementById('tasksTableBody');
            if (retryTbody) {
                loadProjectsForTasks();
            }
        }, 500);
    }
}

// Загрузка проектов для страницы задач
async function loadProjectsForTasks() {
    try {
        const userRole = localStorage.getItem('userRole');
        
        let url = 'https://dmitrii-golubev.ru:7000/api/project';
        
        if (userRole === 'Администратор') {
            url = 'https://dmitrii-golubev.ru:7000/api/project/all';
        }
        
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        
        if (!response.ok) throw new Error(`Ошибка загрузки проектов: ${response.status}`);
        
        projects = await response.json();
        
        if (projects.length === 0) {
            console.warn('⚠️ Проекты не найдены');
        }
        
        updateProjectFilter();
        await loadAllTasksForTasks();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки проектов:', error);
        showTasksError('Не удалось загрузить проекты');
    }
}

// Обновление фильтра проектов
function updateProjectFilter() {
    const projectFilter = document.getElementById('projectFilter');
    if (!projectFilter) {
        console.warn('projectFilter не найден');
        return;
    }
    
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    
    let options = '<option value="">Все проекты</option>';
    
    if (userRole === 'Руководитель проекта') {
        const managerProjects = projects.filter(p => p.projectManagerId === userId);
        managerProjects.forEach(project => {
            options += `<option value="${project.id}">${project.name || 'Без названия'}</option>`;
        });
    } else {
        projects.forEach(project => {
            options += `<option value="${project.id}">${project.name || 'Без названия'}</option>`;
        });
    }
    
    projectFilter.innerHTML = options;
    
    projectFilter.removeEventListener('change', onProjectFilterChange);
    projectFilter.addEventListener('change', onProjectFilterChange);
    
}

// Обработчик изменения проекта в фильтре
function onProjectFilterChange(e) {
    const projectId = e.target.value;
    currentSelectedProjectId = projectId;
    
    updateStatusFilterForProject(projectId);
    updateExecutorFilterForProject(projectId);
    filterTasksForTasks();
}

// Обновление фильтра статусов для выбранного проекта
function updateStatusFilterForProject(projectId) {
    const statusFilter = document.getElementById('statusFilter');
    if (!statusFilter) return;
    
    let options = '<option value="">Все статусы</option>';
    
    if (projectId && projectStatuses[projectId] && projectStatuses[projectId].length > 0) {
        projectStatuses[projectId].forEach(status => {
            options += `<option value="${status.id}">${status.name || 'Без названия'}</option>`;
        });
    } else {
        const allStatuses = Object.values(projectStatuses).flat();
        const uniqueStatuses = [...new Map(allStatuses.map(s => [s.id, s])).values()];
        uniqueStatuses.forEach(status => {
            options += `<option value="${status.id}">${status.name || 'Без названия'}</option>`;
        });
    }
    
    statusFilter.innerHTML = options;
}

// Обновление фильтра исполнителей для выбранного проекта
function updateExecutorFilterForProject(projectId) {
    const executorFilter = document.getElementById('executorFilter');
    if (!executorFilter) return;
    
    let options = '<option value="">Все исполнители</option>';
    
    if (projectId && projectExecutors[projectId] && projectExecutors[projectId].length > 0) {
        projectExecutors[projectId].forEach(executor => {
            const name = executor.name || executor.login || 'Без имени';
            options += `<option value="${executor.id}">${name}</option>`;
        });
    } else {
        const allExecutors = Object.values(projectExecutors).flat();
        const uniqueExecutors = [...new Map(allExecutors.map(e => [e.id, e])).values()];
        uniqueExecutors.forEach(executor => {
            const name = executor.name || executor.login || 'Без имени';
            options += `<option value="${executor.id}">${name}</option>`;
        });
    }
    
    executorFilter.innerHTML = options;
}

// Загрузка всех задач для страницы задач
async function loadAllTasksForTasks() {
    const tbody = document.getElementById('tasksTableBody');
    if (!tbody) {
        console.error('tasksTableBody не найден в loadAllTasksForTasks');
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Нет токена авторизации');
        }
        
        const response = await fetch('https://dmitrii-golubev.ru:7000/api/task/all', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        
        if (!response.ok) {
            if (response.status === 404) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 40px; color: #7f8c8d;">
                            <i class="fas fa-tasks" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                            Нет задач
                        </td>
                    </tr>
                `;
                return;
            }
            throw new Error(`Ошибка загрузки задач: ${response.status}`);
        }
        
        allTasks = await response.json();
        
        if (!allTasks || allTasks.length === 0) {
            console.warn('⚠️ Задачи не найдены');
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: #7f8c8d;">
                        <i class="fas fa-tasks" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                        Нет задач
                    </td>
                </tr>
            `;
            return;
        }
        
        await loadProjectsDataForTasks();
        filterTasksByRoleForTasks();
        await displayTasksForTasks();
        
    } catch (error) {
        console.error('❌ Ошибка загрузки задач:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #e74c3c;">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    Ошибка загрузки задач: ${error.message}
                    <br>
                    <button class="btn btn-primary" onclick="refreshTasksForTasks()" style="margin-top: 10px;">
                        <i class="fas fa-sync-alt"></i> Повторить
                    </button>
                </td>
            </tr>
        `;
    }
}

// Загрузка данных по проектам для задач
async function loadProjectsDataForTasks() {
    const projectIds = [...new Set(allTasks.map(task => task.projectId))];
    
    const promises = projectIds.map(async (projectId) => {
        try {
            const statusesResponse = await fetch(`https://dmitrii-golubev.ru:7000/api/project/${projectId}/statuses`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (statusesResponse.ok) {
                projectStatuses[projectId] = await statusesResponse.json();
            } else {
                console.warn(`⚠️ Статусы для проекта ${projectId} не загружены: ${statusesResponse.status}`);
                projectStatuses[projectId] = [];
            }
            
            const executorsResponse = await fetch(`https://dmitrii-golubev.ru:7000/api/project/${projectId}/users`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (executorsResponse.ok) {
                projectExecutors[projectId] = await executorsResponse.json();
            } else {
                console.warn(`⚠️ Исполнители для проекта ${projectId} не загружены: ${executorsResponse.status}`);
                projectExecutors[projectId] = [];
            }
            
        } catch (error) {
            console.error(`❌ Ошибка загрузки данных для проекта ${projectId}:`, error);
            projectStatuses[projectId] = [];
            projectExecutors[projectId] = [];
        }
    });
    
    await Promise.all(promises);
    
    if (currentSelectedProjectId) {
        updateStatusFilterForProject(currentSelectedProjectId);
        updateExecutorFilterForProject(currentSelectedProjectId);
    } else {
        updateFiltersForTasks();
    }
}

// Фильтрация задач по роли для страницы задач
function filterTasksByRoleForTasks() {
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    
    
    if (userRole === 'Администратор') {
        filteredTasks = [...allTasks];
    } 
    else if (userRole === 'Руководитель проекта') {
        const managerProjectIds = projects.map(p => p.id);
        filteredTasks = allTasks.filter(task => managerProjectIds.includes(task.projectId));
    } 
    else {
        filteredTasks = allTasks.filter(task => task.executorId === userId);
    }
}

// Обновление фильтров для задач (когда проект не выбран)
function updateFiltersForTasks() {
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        const allStatuses = Object.values(projectStatuses).flat();
        const uniqueStatuses = [...new Map(allStatuses.map(s => [s.id, s])).values()];
        
        let options = '<option value="">Все статусы</option>';
        uniqueStatuses.forEach(status => {
            options += `<option value="${status.id}">${status.name || 'Без названия'}</option>`;
        });
        statusFilter.innerHTML = options;
    }
    
    const executorFilter = document.getElementById('executorFilter');
    if (executorFilter) {
        const allExecutors = Object.values(projectExecutors).flat();
        const uniqueExecutors = [...new Map(allExecutors.map(e => [e.id, e])).values()];
        
        let options = '<option value="">Все исполнители</option>';
        uniqueExecutors.forEach(executor => {
            const name = executor.name || executor.login || 'Без имени';
            options += `<option value="${executor.id}">${name}</option>`;
        });
        executorFilter.innerHTML = options;
    }
}

// Применение фильтров для задач
function filterTasksForTasks() {
    const projectId = document.getElementById('projectFilter')?.value;
    const statusId = document.getElementById('statusFilter')?.value;
    const executorId = document.getElementById('executorFilter')?.value;
    
    filteredTasks = allTasks.filter(task => {
        const userRole = localStorage.getItem('userRole');
        const userId = localStorage.getItem('userId');
        
        if (userRole === 'Руководитель проекта') {
            const managerProjectIds = projects.map(p => p.id);
            if (!managerProjectIds.includes(task.projectId)) return false;
        } else if (userRole === 'Исполнитель') {
            if (task.executorId !== userId) return false;
        }
        
        if (projectId && task.projectId !== projectId) return false;
        if (statusId && task.statusId !== statusId) return false;
        if (executorId && task.executorId !== executorId) return false;
        
        return true;
    });
    
    displayTasksForTasks();
}

// Поиск по названию для задач
function searchTasksForTasks() {
    const searchTerm = document.getElementById('taskSearch')?.value.toLowerCase() || '';
    
    if (!searchTerm) {
        filterTasksForTasks();
        return;
    }
    
    const projectId = document.getElementById('projectFilter')?.value;
    const statusId = document.getElementById('statusFilter')?.value;
    const executorId = document.getElementById('executorFilter')?.value;
    
    filteredTasks = allTasks.filter(task => {
        const userRole = localStorage.getItem('userRole');
        const userId = localStorage.getItem('userId');
        
        if (userRole === 'Руководитель проекта') {
            const managerProjectIds = projects.map(p => p.id);
            if (!managerProjectIds.includes(task.projectId)) return false;
        } else if (userRole === 'Исполнитель') {
            if (task.executorId !== userId) return false;
        }
        
        if (projectId && task.projectId !== projectId) return false;
        if (statusId && task.statusId !== statusId) return false;
        if (executorId && task.executorId !== executorId) return false;
        
        return task.name?.toLowerCase().includes(searchTerm);
    });
    
    displayTasksForTasks();
}

// Сброс фильтров для задач
function resetFiltersForTasks() {
    document.getElementById('projectFilter').value = '';
    document.getElementById('statusFilter').value = '';
    document.getElementById('executorFilter').value = '';
    document.getElementById('taskSearch').value = '';
    currentSelectedProjectId = null;
    filterTasksByRoleForTasks();
    displayTasksForTasks();
}

// Получение имени пользователя
async function getUserNameForTasks(userId) {
    if (!userId) return 'Не назначен';
    
    if (usersCache[userId]) {
        return usersCache[userId];
    }
    
    try {
        const response = await fetch(`https://dmitrii-golubev.ru:7000/api/user/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) return 'Неизвестно';
        
        const user = await response.json();
        const name = user.name || user.login || 'Без имени';
        usersCache[userId] = name;
        return name;
        
    } catch (error) {
        console.error('Ошибка загрузки пользователя:', error);
        return 'Ошибка';
    }
}

// Получение инициалов
function getInitialsForTasks(name) {
    if (!name || name === 'Не назначен' || name === 'Неизвестно') return '?';
    
    const parts = name.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

// Получение цвета для статуса
function getStatusColorForTasks(statusName) {
    if (!statusName) return '';
    
    const name = statusName.toLowerCase();
    if (name.includes('завершен') || name.includes('готов') || name.includes('done')) {
        return 'status-completed';
    } else if (name.includes('в работе') || name.includes('active')) {
        return 'status-active';
    } else if (name.includes('проверк')) {
        return 'status-review';
    } else {
        return 'status-pending';
    }
}

// Проверка, является ли статус завершающим
function isCompletedStatusForTasks(statusName) {
    if (!statusName) return false;
    const name = statusName.toLowerCase();
    return name.includes('завершен') || name.includes('готов') || name.includes('done');
}

// Получение класса для дедлайна
function getDeadlineClassForTasks(endDate, statusName) {
    if (!endDate) return '';
    
    if (statusName && isCompletedStatusForTasks(statusName)) {
        return 'deadline-completed';
    }
    
    const deadline = new Date(endDate);
    const today = new Date();
    deadline.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
        return 'deadline-expired';
    } else if (diffDays === 0) {
        return 'deadline-today';
    } else if (diffDays <= 3) {
        return 'deadline-soon';
    }
    
    return '';
}

// Отображение задач для страницы задач
async function displayTasksForTasks() {
    
    const tbody = document.getElementById('tasksTableBody');
    if (!tbody) {
        console.error('❌ tasksTableBody не найден в displayTasksForTasks');
        return;
    }
    
    if (filteredTasks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #7f8c8d;">
                    <i class="fas fa-tasks" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    Нет задач
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    
    for (const task of filteredTasks) {
        const project = projects.find(p => p.id === task.projectId);
        const projectName = project?.name || 'Неизвестный проект';
        
        const executorName = await getUserNameForTasks(task.executorId);
        
        const statuses = projectStatuses[task.projectId] || [];
        const status = statuses.find(s => s.id === task.statusId);
        const statusName = status?.name || 'Неизвестно';
        const statusColor = getStatusColorForTasks(statusName);
        
        const endDate = task.endDate ? new Date(task.endDate).toLocaleDateString('ru-RU') : '—';
        const deadlineClass = getDeadlineClassForTasks(task.endDate, statusName);
        
        const userRole = localStorage.getItem('userRole');
        const userId = localStorage.getItem('userId');
        const canEdit = userRole === 'Администратор' || 
                       userRole === 'Руководитель проекта' || 
                       task.executorId === userId;
        
        html += `
        <tr data-task-id="${task.id}">
            <td>
                <div class="task-title-cell">
                    <div class="task-title">${task.name || 'Без названия'}</div>
                    ${task.description ? `<div class="task-description">${task.description.substring(0, 50)}${task.description.length > 50 ? '...' : ''}</div>` : ''}
                </div>
            </td>
            <td>${projectName}</td>
            <td>
                <div class="assignee-cell">
                    <div class="assignee-avatar">${getInitialsForTasks(executorName)}</div>
                    <div class="assignee-name">${executorName}</div>
                </div>
            </td>
            <td>
                <span class="status-badge ${statusColor}">${statusName}</span>
            </td>
            <td>
                <div class="deadline-cell">
                    <div class="deadline-date ${deadlineClass}">
                        <i class="fas fa-calendar-alt"></i> ${endDate}
                    </div>
                </div>
            </td>
            <td>
                <div class="table-actions-cell">
                    <button class="btn-icon btn-edit-task" onclick="openEditTaskModalFromTasks('${task.id}')" title="Редактировать" ${!canEdit ? 'disabled' : ''}>
                        <i class="fas fa-edit"></i>
                    </button>
                    ${userRole === 'Администратор' || userRole === 'Руководитель проекта' ? `
                    <button class="btn-icon btn-delete-task" onclick="deleteTaskFromTasks('${task.id}')" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                    ` : ''}
                </div>
            </td>
        </tr>
        `;
    }
    
    tbody.innerHTML = html;
}

// ========== ФУНКЦИИ ДЛЯ РАБОТЫ С ЗАДАЧАМИ ==========

// Форматирование даты для API
function formatDateForTasks(dateString) {
    if (!dateString) return null;
    return `${dateString}T00:00:00.024Z`;
}

// Открыть модалку создания задачи
function openCreateTaskModalFromTasks(projectId = null) {
    
    const taskModal = document.getElementById('task-modal-for-tasks-wrapper');
    if (!taskModal) {
        console.error('Модалка task-modal-for-tasks-wrapper не найдена');
        alert('Ошибка: форма создания задачи не загружена');
        return;
    }
    
    const userRole = localStorage.getItem('userRole');
    
    if (userRole !== 'Администратор' && userRole !== 'Руководитель проекта') {
        alert('У вас нет прав для создания задач');
        return;
    }
    
    // Очищаем форму
    document.getElementById('task-id-for-tasks').value = '';
    document.getElementById('task-author-id-for-tasks').value = localStorage.getItem('userId');
    document.getElementById('task-name-for-tasks').value = '';
    document.getElementById('task-description-for-tasks').value = '';
    document.getElementById('task-start-date-for-tasks').value = '';
    document.getElementById('task-end-date-for-tasks').value = '';
    
    // Сбрасываем select проекта
    const projectSelect = document.getElementById('task-project-select-for-tasks');
    if (projectSelect) {
        projectSelect.value = '';
    }
    
    // Блокируем поля до выбора проекта
    const executorSelect = document.getElementById('task-executor-select-for-tasks');
    executorSelect.disabled = true;
    executorSelect.innerHTML = '<option value="">Сначала выберите проект</option>';
    
    const statusSelect = document.getElementById('task-status-select-for-tasks');
    statusSelect.disabled = true;
    statusSelect.innerHTML = '<option value="">Сначала выберите проект</option>';
    
    const parentSelect = document.getElementById('task-parent-select-for-tasks');
    parentSelect.disabled = true;
    parentSelect.innerHTML = '<option value="">Сначала выберите проект</option>';
    
    // Загружаем проекты в select
    loadProjectsForSelect();
    
    // Если передан projectId, выбираем его
    if (projectId) {
        setTimeout(() => {
            const projectSelect = document.getElementById('task-project-select-for-tasks');
            if (projectSelect) {
                projectSelect.value = projectId;
                onProjectChangeForTasks();
            }
        }, 500);
    }
    
    // Устанавливаем заголовок
    const titleElement = document.getElementById('task-modal-for-tasks-title');
    if (titleElement) {
        titleElement.innerHTML = '<i class="fas fa-plus-circle"></i> Создание задачи';
    }
    
    openModal('task-modal-for-tasks-wrapper');
}

// Загрузка проектов в select
function loadProjectsForSelect() {
    const projectSelect = document.getElementById('task-project-select-for-tasks');
    if (!projectSelect) return;
    
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    
    let options = '<option value="">Выберите проект</option>';
    
    if (userRole === 'Администратор') {
        projects.forEach(project => {
            options += `<option value="${project.id}">${project.name || 'Без названия'}</option>`;
        });
    } else if (userRole === 'Руководитель проекта') {
        const managerProjects = projects.filter(p => p.projectManagerId === userId);
        managerProjects.forEach(project => {
            options += `<option value="${project.id}">${project.name || 'Без названия'}</option>`;
        });
    }
    
    projectSelect.innerHTML = options;
}

// Обработчик изменения проекта
function onProjectChangeForTasks() {
    const projectSelect = document.getElementById('task-project-select-for-tasks');
    const projectId = projectSelect.value;
    
    if (!projectId) {
        // Если проект не выбран, блокируем поля
        const executorSelect = document.getElementById('task-executor-select-for-tasks');
        executorSelect.disabled = true;
        executorSelect.innerHTML = '<option value="">Сначала выберите проект</option>';
        
        const statusSelect = document.getElementById('task-status-select-for-tasks');
        statusSelect.disabled = true;
        statusSelect.innerHTML = '<option value="">Сначала выберите проект</option>';
        
        const parentSelect = document.getElementById('task-parent-select-for-tasks');
        parentSelect.disabled = true;
        parentSelect.innerHTML = '<option value="">Сначала выберите проект</option>';
        return;
    }
    
    // Проверяем права
    const userRole = localStorage.getItem('userRole');
    if (userRole === 'Руководитель проекта') {
        const project = projects.find(p => p.id === projectId);
        if (project && project.projectManagerId !== localStorage.getItem('userId')) {
            alert('Вы не можете создавать задачи в этом проекте');
            projectSelect.value = '';
            return;
        }
    }
    
    // Активируем поля
    document.getElementById('task-executor-select-for-tasks').disabled = false;
    document.getElementById('task-status-select-for-tasks').disabled = false;
    document.getElementById('task-parent-select-for-tasks').disabled = false;
    
    // Загружаем данные для выбранного проекта
    loadTaskStatusesForTasks(projectId);
    loadProjectExecutorsForTask(projectId);
    loadProjectTasksForTasksPage(projectId);
}

// Загрузка статусов для задачи
async function loadTaskStatusesForTasks(projectId, selectedStatusId = null) {
    
    try {
        const response = await fetch(`https://dmitrii-golubev.ru:7000/api/project/${projectId}/statuses`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки статусов');
        
        const statuses = await response.json();
        
        const statusSelect = document.getElementById('task-status-select-for-tasks');
        if (!statusSelect) return;
        
        let options = '<option value="">Выберите статус</option>';
        
        statuses.sort((a, b) => (a.order || 0) - (b.order || 0));
        statuses.forEach(status => {
            const selected = (selectedStatusId === status.id) ? 'selected' : '';
            options += `<option value="${status.id}" ${selected}>${status.name}</option>`;
        });
        
        statusSelect.innerHTML = options;
        
    } catch (error) {
        console.error('Ошибка загрузки статусов:', error);
        alert('Не удалось загрузить статусы');
    }
}

// Загрузка исполнителей проекта для задачи
async function loadProjectExecutorsForTask(projectId) {
    
    try {
        const response = await fetch(`https://dmitrii-golubev.ru:7000/api/project/${projectId}/users`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка загрузки исполнителей: ${response.status}`);
        }
        
        const executors = await response.json();
        
        const executorSelect = document.getElementById('task-executor-select-for-tasks');
        if (executorSelect) {
            let options = '<option value="">Выберите исполнителя</option>';
            executors.forEach(executor => {
                const name = executor.name || executor.login || 'Без имени';
                options += `<option value="${executor.id}">${name}</option>`;
            });
            executorSelect.innerHTML = options;
        }
        
    } catch (error) {
        console.error('Ошибка загрузки исполнителей:', error);
        alert('Не удалось загрузить список исполнителей');
    }
}

// Загрузка задач проекта для родительских задач
async function loadProjectTasksForTasksPage(projectId) {
    
    try {
        const response = await fetch(`https://dmitrii-golubev.ru:7000/api/project/${projectId}/tasks`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки задач');
        
        const tasks = await response.json();
        
        const parentSelect = document.getElementById('task-parent-select-for-tasks');
        if (parentSelect) {
            let options = '<option value="">Без родительской задачи</option>';
            tasks.forEach(task => {
                options += `<option value="${task.id}">${task.name}</option>`;
            });
            parentSelect.innerHTML = options;
        }
        
    } catch (error) {
        console.error('Ошибка загрузки задач для родительских:', error);
    }
}

// Сохранение задачи
async function saveTaskFromTasks(event) {
    event.preventDefault();
    
    const taskId = document.getElementById('task-id-for-tasks')?.value;
    const projectSelect = document.getElementById('task-project-select-for-tasks');
    const authorId = document.getElementById('task-author-id-for-tasks')?.value;
    const name = document.getElementById('task-name-for-tasks')?.value.trim();
    const description = document.getElementById('task-description-for-tasks')?.value.trim() || null;
    const executorSelect = document.getElementById('task-executor-select-for-tasks');
    const statusSelect = document.getElementById('task-status-select-for-tasks');
    const parentSelect = document.getElementById('task-parent-select-for-tasks');
    const startDate = document.getElementById('task-start-date-for-tasks')?.value;
    const endDate = document.getElementById('task-end-date-for-tasks')?.value;
    
    if (!projectSelect || !projectSelect.value) {
        alert('Выберите проект');
        return;
    }
    
    if (!name) {
        alert('Введите название задачи');
        return;
    }
    
    if (!executorSelect || !executorSelect.value) {
        alert('Выберите исполнителя');
        return;
    }
    
    if (!statusSelect || !statusSelect.value) {
        alert('Выберите статус');
        return;
    }
    
    const taskData = {
        name: name,
        description: description,
        projectId: projectSelect.value,
        authorId: authorId,
        executorId: executorSelect.value,
        statusId: statusSelect.value
    };
    
    if (taskId) {
        taskData.id = taskId;
    }
    
    if (parentSelect && parentSelect.value) {
        taskData.parentTaskId = parentSelect.value;
    }
    
    if (startDate) {
        taskData.startDate = formatDateForTasks(startDate);
    }
    
    if (endDate) {
        taskData.endDate = formatDateForTasks(endDate);
    }
    
    
    const url = 'https://dmitrii-golubev.ru:7000/api/task';
    const method = taskId ? 'PUT' : 'POST';
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) {
            const text = await response.text();
            throw new Error(text || `Ошибка ${response.status}`);
        }
        
        const result = await response.json();
        
        closeModal('task-modal-for-tasks-wrapper');
        
        await loadAllTasksForTasks();
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при сохранении задачи: ' + error.message);
    } finally {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Открыть модалку редактирования задачи
async function openEditTaskModalFromTasks(taskId) {
    
    try {
        const response = await fetch(`https://dmitrii-golubev.ru:7000/api/task/${taskId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error('Ошибка загрузки задачи');
        
        const task = await response.json();
        
        const project = projects.find(p => p.id === task.projectId);
        if (!project) {
            alert('Проект не найден');
            return;
        }
        
        currentTaskProjectForTasks = project;
        
        // Загружаем проекты в select
        loadProjectsForSelect();
        
        // Устанавливаем заголовок
        const titleElement = document.getElementById('task-modal-for-tasks-title');
        if (titleElement) {
            titleElement.innerHTML = '<i class="fas fa-edit"></i> Редактирование задачи';
        }
        
        // Заполняем форму
        document.getElementById('task-id-for-tasks').value = task.id;
        document.getElementById('task-author-id-for-tasks').value = task.authorId;
        document.getElementById('task-name-for-tasks').value = task.name || '';
        document.getElementById('task-description-for-tasks').value = task.description || '';
        
        if (task.startDate) {
            document.getElementById('task-start-date-for-tasks').value = task.startDate.split('T')[0];
        }
        if (task.endDate) {
            document.getElementById('task-end-date-for-tasks').value = task.endDate.split('T')[0];
        }
        
        // Устанавливаем проект и загружаем зависимые данные
        setTimeout(() => {
            const projectSelect = document.getElementById('task-project-select-for-tasks');
            if (projectSelect) {
                projectSelect.value = task.projectId;
                onProjectChangeForTasks();
                
                // После загрузки данных устанавливаем значения
                setTimeout(() => {
                    const statusSelect = document.getElementById('task-status-select-for-tasks');
                    if (statusSelect && task.statusId) {
                        statusSelect.value = task.statusId;
                    }
                    
                    const executorSelect = document.getElementById('task-executor-select-for-tasks');
                    if (executorSelect && task.executorId) {
                        executorSelect.value = task.executorId;
                    }
                    
                    const parentSelect = document.getElementById('task-parent-select-for-tasks');
                    if (parentSelect && task.parentTaskId) {
                        parentSelect.value = task.parentTaskId;
                    }
                }, 500);
            }
        }, 500);
        
        openModal('task-modal-for-tasks-wrapper');
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось загрузить данные задачи');
    }
}

// Удаление задачи
async function deleteTaskFromTasks(taskId) {
    if (!confirm('Вы уверены, что хотите удалить задачу?')) {
        return;
    }
    
    try {
        const response = await fetch(`https://dmitrii-golubev.ru:7000/api/task/${taskId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}`);
        }
        
        await loadAllTasksForTasks();
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении задачи: ' + error.message);
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function toggleFilterDropdownForTasks() {
    const content = document.getElementById('filterContent');
    if (content) {
        content.classList.toggle('show');
    }
}

function refreshTasksForTasks() {
    loadAllTasksForTasks();
}

function showTasksError(message) {
    const tbody = document.getElementById('tasksTableBody');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #e74c3c;">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    ${message}
                </td>
            </tr>
        `;
    }
}

document.addEventListener('click', function(e) {
    const filterContent = document.getElementById('filterContent');
    const filterToggle = document.querySelector('.filter-toggle');
    
    if (filterContent && filterToggle && 
        !filterContent.contains(e.target) && 
        !filterToggle.contains(e.target)) {
        filterContent.classList.remove('show');
    }
});

// ========== ЭКСПОРТ ФУНКЦИЙ ==========
window.initTasksPage = initTasksPage;
window.openCreateTaskModalFromTasks = openCreateTaskModalFromTasks;
window.openEditTaskModalFromTasks = openEditTaskModalFromTasks;
window.deleteTaskFromTasks = deleteTaskFromTasks;
window.saveTaskFromTasks = saveTaskFromTasks;
window.onProjectChangeForTasks = onProjectChangeForTasks;
window.filterTasksForTasks = filterTasksForTasks;
window.searchTasksForTasks = searchTasksForTasks;
window.resetFiltersForTasks = resetFiltersForTasks;
window.toggleFilterDropdownForTasks = toggleFilterDropdownForTasks;
window.refreshTasksForTasks = refreshTasksForTasks;

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (document.getElementById('tasksTableBody')) {
            initTasksPage();
        }
    }, 1500);
});