// Глобальные переменные для главной страницы
let mainProjects = [];
let mainStatuses = {};
let projectTasks = {};
let currentTaskProject = null;
let currentTaskStatuses = [];
let currentProjectTasks = [];

// Загрузка главной страницы
function loadDashboard() {
    console.log('Загрузка главной страницы');
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    
    if (userRole === 'Администратор') {
        loadAllProjects();
    } else if (userRole === 'Руководитель проекта') {
        loadManagerProjects();
    } else {
        loadUserProjects(userId);
    }
}

// Загрузка всех проектов для админа
function loadAllProjects() {
    fetch('https://dmitrii-golubev.ru:7000/api/project/all', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(projects => {
        console.log('Все проекты для главной:', projects);
        mainProjects = projects;
        loadStatusesForProjects(projects);
    })
    .catch(error => console.error('Ошибка загрузки проектов:', error));
}

// Загрузка проектов где пользователь руководитель
function loadManagerProjects() {
    fetch('https://dmitrii-golubev.ru:7000/api/project', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(projects => {
        console.log('Проекты где пользователь руководитель:', projects);
        mainProjects = projects;
        loadStatusesForProjects(projects);
    })
    .catch(error => console.error('Ошибка загрузки проектов руководителя:', error));
}

// Загрузка проектов где пользователь исполнитель
function loadUserProjects(userId) {
    fetch(`https://dmitrii-golubev.ru:7000/api/user-project/user/${userId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 404) {
                console.log('У пользователя нет проектов');
                mainProjects = [];
                loadStatusesForProjects([]);
                return [];
            }
            throw new Error(`Ошибка загрузки: ${response.status}`);
        }
        return response.json();
    })
    .then(userProjects => {
        console.log('Проекты пользователя:', userProjects);
        
        if (!userProjects || userProjects.length === 0) {
            mainProjects = [];
            loadStatusesForProjects([]);
            return;
        }
        
        const projectPromises = userProjects.map(up => 
            fetch(`https://dmitrii-golubev.ru:7000/api/project/${up.projectId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }).then(res => res.json())
        );
        
        return Promise.all(projectPromises);
    })
    .then(projects => {
        if (projects) {
            console.log('Детальная информация проектов:', projects);
            mainProjects = projects;
        }
        loadStatusesForProjects(mainProjects);
    })
    .catch(error => {
        console.error('Ошибка загрузки проектов пользователя:', error);
        mainProjects = [];
        loadStatusesForProjects([]);
    });
}

// Загрузка статусов и задач для проектов
function loadStatusesForProjects(projects) {
    if (!projects || projects.length === 0) {
        displayDashboard();
        return;
    }
    
    const statusPromises = projects.map(project => 
        fetch(`https://dmitrii-golubev.ru:7000/api/project/${project.id}/statuses`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(res => res.json())
        .then(statuses => {
            mainStatuses[project.id] = statuses;
        })
    );
    
    Promise.all(statusPromises).then(() => {
        console.log('Все статусы загружены:', mainStatuses);
        loadProjectsTasks(projects);
    });
}

// Загрузка задач для проектов
function loadProjectsTasks(projects) {
    if (!projects || projects.length === 0) {
        displayDashboard();
        return;
    }
    
    const taskPromises = projects.map(project => 
        fetch(`https://dmitrii-golubev.ru:7000/api/project/${project.id}/tasks`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(res => res.json())
        .then(tasks => {
            projectTasks[project.id] = tasks;
        })
    );
    
    Promise.all(taskPromises).then(() => {
        console.log('Все задачи загружены:', projectTasks);
        displayDashboard();
    });
}

// Загрузка имен исполнителей
function loadExecutorNames(tasks) {
    const uniqueExecutors = [...new Set(tasks.map(t => t.executorId).filter(id => id))];
    
    if (uniqueExecutors.length === 0) return;
    
    Promise.all(uniqueExecutors.map(executorId => 
        fetch(`https://dmitrii-golubev.ru:7000/api/user/${executorId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(res => res.json())
        .then(user => ({ executorId, name: user.name || user.login || 'Неизвестно' }))
        .catch(() => ({ executorId, name: 'Ошибка загрузки' }))
    )).then(executors => {
        // Обновляем имена в задачах
        executors.forEach(({ executorId, name }) => {
            tasks.forEach(task => {
                if (task.executorId === executorId) {
                    task.executorName = name;
                }
            });
        });
        
        // Обновляем отображение
        displayDashboard();
    });
}

// Отображение главной страницы
// Отображение главной страницы
function displayDashboard() {
    const dashboard = document.getElementById('dashboard');
    if (!dashboard) return;
    
    const userRole = localStorage.getItem('userRole');
    const userId = localStorage.getItem('userId');
    const isAdmin = userRole === 'Администратор';
    
    let html = '';
    let pendingTasks = [];
    
    mainProjects.forEach(project => {
        const statuses = mainStatuses[project.id] || [];
        const sortedStatuses = [...statuses].sort((a, b) => (a.order || 0) - (b.order || 0));
        
        const allProjectTasks = projectTasks[project.id] || [];
        
        const filteredTasks = isAdmin 
            ? allProjectTasks 
            : allProjectTasks.filter(task => task.executorId === userId);
        
        html += `
        <div class="board-container">
            <div class="board-header">
                <h2>Задачи проекта: ${project.name || 'Без названия'} ${project.num ? `(№${project.num})` : ''}</h2>
                <div class="board-actions">
                    <button class="btn btn-primary" onclick="openCreateTaskModal('${project.id}')">
                        <i class="fas fa-plus"></i> Добавить задачу
                    </button>
                </div>
            </div>
            <div class="task-board">
        `;
        
        sortedStatuses.forEach((status) => {
            const statusTasks = filteredTasks.filter(task => task.statusId === status.id) || [];
            
            html += `
                <div class="task-column" data-status-id="${status.id}" data-project-id="${project.id}">
                    <div class="column-header">
                        <h3>${status.name || 'Без названия'}</h3>
                        <div class="task-count">${statusTasks.length}</div>
                    </div>
                    <div class="task-list" id="status-${status.id}">
            `;
            
            statusTasks.forEach(task => {
                if (task.executorId && !task.executorName) {
                    pendingTasks.push(task);
                }
                
                const executorName = task.executorName || 'Загрузка...';
                
                // Определяем дедлайн только для незавершенных задач
                let deadlineHtml = '';
                const isCompleted = task.statusId === getCompletedStatusId(project.id);
                
                if (task.endDate && !isCompleted) {
                    const deadline = new Date(task.endDate);
                    const today = new Date();
                    deadline.setHours(0, 0, 0, 0);
                    today.setHours(0, 0, 0, 0);
                    
                    const diffTime = deadline - today;
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    let deadlineClass = 'deadline-normal';
                    let deadlineText = `Дедлайн: ${deadline.toLocaleDateString('ru-RU')}`;
                    
                    if (diffDays < 0) {
                        deadlineClass = 'deadline-expired';
                        deadlineText = `Просрочено на ${Math.abs(diffDays)} дн.`;
                    } else if (diffDays === 0) {
                        deadlineClass = 'deadline-today';
                        deadlineText = 'Дедлайн сегодня!';
                    } else if (diffDays <= 3) {
                        deadlineClass = 'deadline-soon';
                        deadlineText = `Осталось ${diffDays} дн.`;
                    }
                    
                    deadlineHtml = `<span class="deadline ${deadlineClass}"><i class="fas fa-hourglass-half"></i> ${deadlineText}</span>`;
                } else if (task.endDate && isCompleted) {
                    // Для завершенных задач показываем дату завершения без подсветки
                    const completedDate = new Date(task.endDate).toLocaleDateString('ru-RU');
                    deadlineHtml = `<span class="deadline deadline-completed"><i class="fas fa-check-circle"></i> Завершено: ${completedDate}</span>`;
                }
                
                html += `
                <div class="task-card ${isCompleted ? 'task-completed' : ''}" data-task-id="${task.id}">
                    <div class="task-card-header">
                        <h4 onclick="openEditTaskModal('${task.id}')" style="cursor: pointer;">${task.name}</h4>
                        <div class="task-card-actions">
                            <button class="task-btn task-btn-edit" onclick="openEditTaskModal('${task.id}')" title="Редактировать">
                                <i class="fas fa-pen"></i>
                            </button>
                            <button class="task-btn task-btn-delete" onclick="deleteTask('${task.id}')" title="Удалить">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="task-meta">
                        <span class="task-executor"><i class="fas fa-user-circle"></i> ${executorName}</span>
                        ${deadlineHtml}
                    </div>
                </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
        </div>
        `;
    });
    
    if (mainProjects.length === 0) {
        html = `
        <div class="board-container">
            <div class="board-header">
                <h2>Нет доступных проектов</h2>
            </div>
        </div>
        `;
    }
    
    dashboard.innerHTML = html;
    
    if (pendingTasks.length > 0) {
        loadExecutorNames(pendingTasks);
    }
}

// Вспомогательная функция для определения ID статуса "Завершен"
function getCompletedStatusId(projectId) {
    const statuses = mainStatuses[projectId] || [];
    // Ищем статус с названием "Завершен" или похожим
    const completedStatus = statuses.find(s => 
        s.name.toLowerCase().includes('завершен') || 
        s.name.toLowerCase().includes('готов') ||
        s.name.toLowerCase().includes('done')
    );
    return completedStatus ? completedStatus.id : null;
}
// Форматирование даты для API
function formatDateForAPI(dateString) {
    if (!dateString) return null;
    return `${dateString}T00:00:00.024Z`;
}

// Открыть модалку создания задачи
// Открыть модалку создания задачи
function openCreateTaskModal(projectId) {
    console.log('Открытие создания задачи для проекта:', projectId);
    
    const project = mainProjects.find(p => p.id === projectId);
    if (!project) {
        alert('Проект не найден');
        return;
    }
    
    currentTaskProject = project;
    
    const titleElement = document.getElementById('task-modal-title');
    if (titleElement) {
        titleElement.innerHTML = '<i class="fas fa-plus-circle"></i> Создание задачи';
    }
    
    // Очищаем форму
    const taskIdField = document.getElementById('task-id');
    const projectIdField = document.getElementById('task-project-id');
    const authorIdField = document.getElementById('task-author-id');
    const taskNameField = document.getElementById('task-name');
    const taskDescField = document.getElementById('task-description');
    const executorField = document.getElementById('task-executor');
    const parentSearchField = document.getElementById('task-parent-search');
    const startDateField = document.getElementById('task-start-date');
    const endDateField = document.getElementById('task-end-date');
    const parentSelect = document.getElementById('task-parent-select');
    
    if (taskIdField) taskIdField.value = '';
    if (projectIdField) projectIdField.value = projectId;
    if (authorIdField) authorIdField.value = localStorage.getItem('userId');
    if (taskNameField) taskNameField.value = '';
    if (taskDescField) taskDescField.value = '';
    if (parentSearchField) parentSearchField.value = '';
    if (startDateField) startDateField.value = '';
    if (endDateField) endDateField.value = '';
    
    // Устанавливаем текущего пользователя как исполнителя (только для чтения)
    const userId = localStorage.getItem('userId');
    const userData = localStorage.getItem('userData');
    
    if (userId && userData) {
        try {
            const user = JSON.parse(userData);
            const displayName = user.name || user.login || 'Текущий пользователь';
            
            if (executorField) {
                executorField.value = displayName;
                executorField.readOnly = true;
                executorField.disabled = true;
            }
            
            // Создаем скрытое поле для executorId
            let hiddenExecutorId = document.getElementById('task-executor-id-hidden');
            if (!hiddenExecutorId) {
                hiddenExecutorId = document.createElement('input');
                hiddenExecutorId.type = 'hidden';
                hiddenExecutorId.id = 'task-executor-id-hidden';
                document.getElementById('task-form').appendChild(hiddenExecutorId);
            }
            hiddenExecutorId.value = userId;
            
        } catch (e) {
            console.error('Ошибка парсинга userData:', e);
        }
    }
    
    // Загружаем статусы проекта
    loadTaskStatuses(projectId);
    
    // Загружаем задачи проекта для родительских задач
    loadProjectTasksForParent(projectId);
    
    openModal('task-modal-wrapper');
}


// Открыть модалку редактирования задачи
function openEditTaskModal(taskId) {
    console.log('Открытие редактирования задачи:', taskId);
    
    fetch(`https://dmitrii-golubev.ru:7000/api/task/${taskId}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) throw new Error('Ошибка загрузки задачи');
        return response.json();
    })
    .then(task => {
        console.log('Данные задачи:', task);
        
        currentTaskProject = mainProjects.find(p => p.id === task.projectId);
        
        const titleElement = document.getElementById('task-modal-title');
        if (titleElement) {
            titleElement.innerHTML = '<i class="fas fa-edit"></i> Редактирование задачи';
        }
        
        const taskIdField = document.getElementById('task-id');
        const projectIdField = document.getElementById('task-project-id');
        const authorIdField = document.getElementById('task-author-id');
        const taskNameField = document.getElementById('task-name');
        const taskDescField = document.getElementById('task-description');
        const executorField = document.getElementById('task-executor');
        const startDateField = document.getElementById('task-start-date');
        const endDateField = document.getElementById('task-end-date');
        const parentSearchField = document.getElementById('task-parent-search');
        const parentSelect = document.getElementById('task-parent-select');
        
        if (taskIdField) taskIdField.value = task.id;
        if (projectIdField) projectIdField.value = task.projectId;
        if (authorIdField) authorIdField.value = task.authorId;
        if (taskNameField) taskNameField.value = task.name || '';
        if (taskDescField) taskDescField.value = task.description || '';
        
        if (task.startDate && startDateField) {
            startDateField.value = task.startDate.split('T')[0];
        }
        if (task.endDate && endDateField) {
            endDateField.value = task.endDate.split('T')[0];
        }
        
        // Очищаем поля поиска
        if (parentSearchField) parentSearchField.value = '';
        
        // Загружаем статусы
        loadTaskStatuses(task.projectId, task.statusId);
        
        // Загружаем задачи для родительских
        loadProjectTasksForParent(task.projectId, task.parentTaskId);
        
        // Устанавливаем исполнителя (только для чтения)
        if (task.executorId) {
            fetch(`https://dmitrii-golubev.ru:7000/api/user/${task.executorId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
            .then(res => res.json())
            .then(user => {
                const displayName = user.name || user.login || 'Исполнитель';
                if (executorField) {
                    executorField.value = displayName;
                    executorField.readOnly = true;
                    executorField.disabled = true;
                }
                
                // Обновляем скрытое поле
                let hiddenExecutorId = document.getElementById('task-executor-id-hidden');
                if (!hiddenExecutorId) {
                    hiddenExecutorId = document.createElement('input');
                    hiddenExecutorId.type = 'hidden';
                    hiddenExecutorId.id = 'task-executor-id-hidden';
                    document.getElementById('task-form').appendChild(hiddenExecutorId);
                }
                hiddenExecutorId.value = task.executorId;
            });
        }
        
        openModal('task-modal-wrapper');
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Не удалось загрузить данные задачи');
    });
}

// Загрузка статусов для задачи
function loadTaskStatuses(projectId, selectedStatusId = null) {
    fetch(`https://dmitrii-golubev.ru:7000/api/project/${projectId}/statuses`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(statuses => {
        console.log('Статусы для задачи:', statuses);
        currentTaskStatuses = statuses;
        
        const statusSelect = document.getElementById('task-status-select');
        if (!statusSelect) return;
        
        let options = '<option value="">Выберите статус</option>';
        
        statuses.sort((a, b) => (a.order || 0) - (b.order || 0));
        statuses.forEach(status => {
            const selected = (selectedStatusId === status.id) ? 'selected' : '';
            options += `<option value="${status.id}" ${selected}>${status.name}</option>`;
        });
        
        statusSelect.innerHTML = options;
    })
    .catch(error => console.error('Ошибка загрузки статусов:', error));
}

// Загрузка задач проекта для родительских задач
function loadProjectTasksForParent(projectId, selectedParentId = null) {
    fetch(`https://dmitrii-golubev.ru:7000/api/project/${projectId}/tasks`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(tasks => {
        console.log('Задачи проекта для родительских:', tasks);
        currentProjectTasks = tasks;
        
        const parentSelect = document.getElementById('task-parent-select');
        if (!parentSelect) return;
        
        let options = '<option value="">Без родительской задачи</option>';
        
        tasks.forEach(task => {
            const selected = (selectedParentId === task.id) ? 'selected' : '';
            options += `<option value="${task.id}" ${selected}>${task.name}</option>`;
        });
        
        parentSelect.innerHTML = options;
        
        // Если есть выбранная родительская задача, отображаем её в поиске
        if (selectedParentId) {
            const parentTask = tasks.find(t => t.id === selectedParentId);
            const parentSearchField = document.getElementById('task-parent-search');
            if (parentTask && parentSearchField) {
                parentSearchField.value = parentTask.name;
            }
        }
    })
    .catch(error => console.error('Ошибка загрузки задач:', error));
}

// Поиск исполнителя
function searchTaskExecutor() {
    const searchInput = document.getElementById('task-executor-search');
    const listElement = document.getElementById('task-executor-list');
    
    if (!searchInput || !listElement) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    
    listElement.innerHTML = '';
    listElement.style.display = 'none';
    
    if (!searchTerm || searchTerm.length < 1) return;
    
    fetch('https://dmitrii-golubev.ru:7000/api/user/all', {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(users => {
        const executors = users.filter(u => u.role === 2 && u.isActive);
        const filtered = executors.filter(u => 
            (u.name && u.name.toLowerCase().includes(searchTerm)) ||
            (u.login && u.login.toLowerCase().includes(searchTerm))
        );
        
        if (filtered.length === 0) {
            const div = document.createElement('div');
            div.className = 'search-item disabled';
            div.textContent = 'Ничего не найдено';
            listElement.appendChild(div);
            listElement.style.display = 'block';
            return;
        }
        
        filtered.slice(0, 5).forEach(u => {
            const displayName = u.name || u.login || 'Без имени';
            const div = document.createElement('div');
            div.className = 'search-item';
            div.textContent = displayName;
            div.onclick = () => {
                searchInput.value = displayName;
                const select = document.getElementById('task-executor-select');
                if (select) {
                    select.innerHTML = `<option value="${u.id}" selected>${displayName}</option>`;
                }
                listElement.style.display = 'none';
            };
            listElement.appendChild(div);
        });
        
        listElement.style.display = 'block';
    });
}

// Поиск родительской задачи
function searchParentTask() {
    const searchInput = document.getElementById('task-parent-search');
    const listElement = document.getElementById('task-parent-list');
    
    if (!searchInput || !listElement) return;
    
    const searchTerm = searchInput.value.toLowerCase();
    
    listElement.innerHTML = '';
    listElement.style.display = 'none';
    
    if (!searchTerm || searchTerm.length < 1) return;
    
    const filtered = currentProjectTasks.filter(task => 
        task.name && task.name.toLowerCase().includes(searchTerm)
    );
    
    if (filtered.length === 0) {
        const div = document.createElement('div');
        div.className = 'search-item disabled';
        div.textContent = 'Ничего не найдено';
        listElement.appendChild(div);
        listElement.style.display = 'block';
        return;
    }
    
    filtered.slice(0, 5).forEach(task => {
        const div = document.createElement('div');
        div.className = 'search-item';
        div.textContent = task.name;
        div.onclick = () => {
            searchInput.value = task.name;
            const select = document.getElementById('task-parent-select');
            if (select) {
                select.innerHTML = `<option value="${task.id}" selected>${task.name}</option>`;
            }
            listElement.style.display = 'none';
        };
        listElement.appendChild(div);
    });
    
    listElement.style.display = 'block';
}

// Сохранение задачи
function saveTask(event) {
    event.preventDefault();
    
    const taskId = document.getElementById('task-id')?.value;
    const projectId = document.getElementById('task-project-id')?.value;
    const authorId = document.getElementById('task-author-id')?.value;
    const name = document.getElementById('task-name')?.value.trim();
    const description = document.getElementById('task-description')?.value.trim() || null;
    const hiddenExecutorId = document.getElementById('task-executor-id-hidden');
    const statusSelect = document.getElementById('task-status-select');
    const parentSelect = document.getElementById('task-parent-select');
    const startDate = document.getElementById('task-start-date')?.value;
    const endDate = document.getElementById('task-end-date')?.value;
    
    if (!hiddenExecutorId || !hiddenExecutorId.value) {
        alert('Ошибка: исполнитель не определен');
        return;
    }
    
    if (!statusSelect || !statusSelect.value) {
        alert('Выберите статус');
        return;
    }
    
    const taskData = {
        name: name,
        description: description,
        projectId: projectId,
        authorId: authorId,
        executorId: hiddenExecutorId.value,
        statusId: statusSelect.value
    };
    
    if (taskId) {
        taskData.id = taskId;
    }
    
    if (parentSelect && parentSelect.value) {
        taskData.parentTaskId = parentSelect.value;
    }
    
    if (startDate) {
        taskData.startDate = formatDateForAPI(startDate);
    }
    
    if (endDate) {
        taskData.endDate = formatDateForAPI(endDate);
    }
    
    console.log('Сохранение задачи:', taskData);
    
    const url = 'https://dmitrii-golubev.ru:7000/api/task';
    const method = taskId ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(taskData)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || `Ошибка ${response.status}`);
            });
        }
        return response.json();
    })
    .then(result => {
        console.log('Задача сохранена:', result);
        closeModal('task-modal-wrapper');
        alert('Задача успешно сохранена');
        loadDashboard();
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при сохранении задачи: ' + error.message);
    });
}

// Удаление задачи
function deleteTask(taskId) {
    if (!confirm('Вы уверены, что хотите удалить задачу?')) {
        return;
    }
    
    fetch(`https://dmitrii-golubev.ru:7000/api/task/${taskId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Ошибка ${response.status}`);
        }
        alert('Задача успешно удалена');
        loadDashboard();
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении задачи: ' + error.message);
    });
}

// Делаем функции глобальными
window.loadDashboard = loadDashboard;
window.openCreateTaskModal = openCreateTaskModal;
window.openEditTaskModal = openEditTaskModal;
window.searchTaskExecutor = searchTaskExecutor;
window.searchParentTask = searchParentTask;
window.saveTask = saveTask;
window.deleteTask = deleteTask;
window.formatDateForAPI = formatDateForAPI;