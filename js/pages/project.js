// Глобальные переменные
let allCustomers = [];
let allProjects = [];
let allUsers = {}; // Объект для кэша пользователей
let allUsersList = []; // Массив для списка пользователей
let allCustomersCache = {}; // Объект для кэша заказчиков
let currentProjectForMembers = null;
let currentProjectForStatuses = null;

// Загрузка пользователя по ID
async function getUserName(userId) {
    if (!userId) return 'Не указан';
    
    // Проверяем кэш
    if (allUsers[userId]) {
        return allUsers[userId];
    }
    
    try {
        const response = await fetch(`https://dmitrii-golubev.ru:7000/api/user/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            console.error('Ошибка загрузки пользователя:', userId);
            return 'Неизвестный пользователь';
        }
        
        const user = await response.json();
        const userName = user.name || user.login || 'Без имени';
        
        // Сохраняем в кэш
        allUsers[userId] = userName;
        return userName;
        
    } catch (error) {
        console.error('Ошибка при загрузке пользователя:', error);
        return 'Ошибка загрузки';
    }
}

// Загрузка заказчика по ID
async function getCustomerName(customerId) {
    if (!customerId) return 'Не указан';
    
    // Проверяем кэш
    if (allCustomersCache[customerId]) {
        return allCustomersCache[customerId];
    }
    
    try {
        const response = await fetch(`https://dmitrii-golubev.ru:7000/api/customer/${customerId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) {
            console.error('Ошибка загрузки заказчика:', customerId);
            return 'Неизвестный заказчик';
        }
        
        const customer = await response.json();
        const customerName = customer.name || 'Без имени';
        
        // Сохраняем в кэш
        allCustomersCache[customerId] = customerName;
        return customerName;
        
    } catch (error) {
        console.error('Ошибка при загрузке заказчика:', error);
        return 'Ошибка загрузки';
    }
}

// Загрузка проектов в зависимости от роли
function loadProjects() {
    const userRole = localStorage.getItem('userRole');
    
    let url = 'https://dmitrii-golubev.ru:7000/api/project';
    if (userRole === 'Администратор') {
        url = 'https://dmitrii-golubev.ru:7000/api/project/all';
    }
    
    fetch(url, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(async projects => {
        console.log('Проекты загружены:', projects);
        allProjects = projects;
        
        // Загружаем имена руководителей и заказчиков для всех проектов
        for (const project of projects) {
            // Загружаем руководителя
            if (project.projectManagerId) {
                project.managerName = await getUserName(project.projectManagerId);
            } else {
                project.managerName = 'Не указан';
            }
            
            // Загружаем заказчика
            if (project.customerId) {
                project.customerName = await getCustomerName(project.customerId);
            } else {
                project.customerName = 'Не указан';
            }
        }
        
        displayProjects(projects);
    })
    .catch(error => console.error('Ошибка загрузки проектов:', error));
}

// Отображение проектов
function displayProjects(projects) {
    const projectsGrid = document.getElementById('projectsGrid');
    if (!projectsGrid) {
        console.error('projectsGrid не найден');
        return;
    }
    
    if (!projects || projects.length === 0) {
        projectsGrid.innerHTML = '<div class="no-projects">Нет проектов</div>';
        return;
    }
    
    let html = '';
    projects.forEach(project => {
        const startDate = project.startDate ? new Date(project.startDate).toLocaleDateString('ru-RU') : 'Не указана';
        const planningEndDate = project.planningEndDate ? new Date(project.planningEndDate).toLocaleDateString('ru-RU') : 'Не указана';
        const actualEndDate = project.endDate ? new Date(project.endDate).toLocaleDateString('ru-RU') : null;
        
        const budget = project.cost ? new Intl.NumberFormat('ru-RU').format(project.cost) + ' ₽' : 'Не указан';
        
        // Получаем статус
        const statusText = getStatusText(project.status);
        
        // Формируем строку с датами
        let datesHtml = `
            <div class="project-info-item">
                <i class="fas fa-calendar-alt"></i>
                <span class="project-info-label">Начало:</span>
                <span class="project-info-value">${startDate}</span>
            </div>
            <div class="project-info-item">
                <i class="fas fa-calendar-check"></i>
                <span class="project-info-label">План:</span>
                <span class="project-info-value">${planningEndDate}</span>
            </div>
        `;
        
        // Если есть фактическая дата, показываем её
        if (actualEndDate) {
            datesHtml += `
                <div class="project-info-item">
                    <i class="fas fa-flag-checkered"></i>
                    <span class="project-info-label">Факт:</span>
                    <span class="project-info-value">${actualEndDate}</span>
                </div>
            `;
        }
        
        html += `
        <div class="project-card" data-project-id="${project.id}">
            <div class="project-card-header">
                <div class="project-title-section">
                    <h3>${project.name || 'Без названия'}</h3>
                    <div class="project-actions">
                        <button class="btn-icon btn-users" title="Управление исполнителями" onclick="manageProjectMembers('${project.id}')">
                            <i class="fas fa-users"></i>
                        </button>
                        <button class="btn-icon btn-statuses" title="Управление статусами" onclick="manageProjectStatuses('${project.id}')">
                            <i class="fas fa-tasks"></i>
                        </button>
                        <button class="btn-icon btn-edit" title="Редактировать" onclick="editProject('${project.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" title="Удалить" onclick="deleteProject('${project.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="project-status-section">
                    <span class="status-badge status-${project.status}">${statusText}</span>
                </div>
            </div>
            
            <div class="project-info">
                <div class="project-info-item">
                    <i class="fas fa-hashtag"></i>
                    <span class="project-info-label">Номер:</span>
                    <span class="project-info-value">${project.num || 'Не указан'}</span>
                </div>
                <div class="project-info-item">
                    <i class="fas fa-building"></i>
                    <span class="project-info-label">Заказчик:</span>
                    <span class="project-info-value">${project.customerName || 'Загрузка...'}</span>
                </div>
                <div class="project-info-item">
                    <i class="fas fa-user-tie"></i>
                    <span class="project-info-label">Руководитель:</span>
                    <span class="project-info-value">${project.managerName || 'Загрузка...'}</span>
                </div>
                <div class="project-info-item">
                    <i class="fas fa-wallet"></i>
                    <span class="project-info-label">Бюджет:</span>
                    <span class="project-info-value">${budget}</span>
                </div>
                ${datesHtml}
            </div>
        </div>
        `;
    });
    
    projectsGrid.innerHTML = html;
}

// Получение текста статуса
function getStatusText(status) {
    const statusMap = {
        0: 'Планирование',
        1: 'В работе',
        2: 'Завершен'
    };
    return statusMap[status] || 'Неизвестно';
}

// Загрузка всех заказчиков (для поиска)
function loadCustomers() {
    fetch('https://dmitrii-golubev.ru:7000/api/customer/all', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(customers => {
        console.log('Заказчики загружены:', customers);
        allCustomers = customers;
        
        // Также заполняем кэш заказчиков
        customers.forEach(customer => {
            allCustomersCache[customer.id] = customer.name;
        });
    })
    .catch(error => console.error('Ошибка загрузки заказчиков:', error));
}

// Загрузка всех пользователей (для поиска руководителей)
function loadAllUsers() {
    fetch('https://dmitrii-golubev.ru:7000/api/user/all', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(users => {
        console.log('Пользователи загружены:', users);
        allUsersList = users;
        
        // Заполняем кэш пользователей
        users.forEach(user => {
            allUsers[user.id] = user.name || user.login || 'Без имени';
        });
    })
    .catch(error => console.error('Ошибка загрузки пользователей:', error));
}

// Поиск заказчика
function searchCustomer() {
    const input = document.getElementById('customerSearchInput');
    const list = document.getElementById('customerSearchList');
    
    if (!input || !list) return;
    
    const searchTerm = input.value.toLowerCase();
    
    list.innerHTML = '';
    list.style.display = 'none';
    
    if (!searchTerm || searchTerm.length < 1) return;
    
    const filtered = allCustomers.filter(c => 
        c.name.toLowerCase().includes(searchTerm)
    );
    
    if (filtered.length === 0) {
        const div = document.createElement('div');
        div.className = 'search-item disabled';
        div.textContent = 'Ничего не найдено';
        list.appendChild(div);
        list.style.display = 'block';
        return;
    }
    
    filtered.slice(0, 5).forEach(c => {
        const div = document.createElement('div');
        div.className = 'search-item';
        div.textContent = c.name;
        div.onclick = () => {
            input.value = c.name;
            const select = document.getElementById('customerSelect');
            select.innerHTML = `<option value="${c.id}" selected>${c.name}</option>`;
            list.style.display = 'none';
        };
        list.appendChild(div);
    });
    
    list.style.display = 'block';
}

// Форматирование даты в нужный формат
function formatDateForAPI(dateString) {
    if (!dateString) return null;
    return `${dateString}T00:00:00.024Z`;
}

// Создание проекта
function createProject(event) {
    event.preventDefault();
    
    const select = document.getElementById('customerSelect');
    const selectedOption = select.querySelector('option:checked');
    
    if (!selectedOption || !selectedOption.value) {
        alert('Выберите заказчика');
        return;
    }
    
    const startDate = document.getElementById('startDateInput').value;
    const planningEndDate = document.getElementById('planningEndDateInput').value;
    
    const projectData = {
        name: document.getElementById('projectNameInput').value.trim(),
        num: document.getElementById('projectNumInput').value.trim() || null,
        customerId: selectedOption.value,
        projectManagerId: document.getElementById('projectManagerSelect').value,
        startDate: formatDateForAPI(startDate),
        planningEndDate: formatDateForAPI(planningEndDate),
        cost: document.getElementById('budgetInput').value ? 
              parseInt(document.getElementById('budgetInput').value) : null
    };
    
    if (!projectData.name) {
        alert('Введите название проекта');
        return;
    }
    
    console.log('Отправка данных:', projectData);
    
    fetch('https://dmitrii-golubev.ru:7000/api/project', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(projectData)
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
        console.log('Проект создан:', result);
        closeModal('create-project-wrapper');
        alert('Проект успешно создан');
        loadProjects(); // Перезагружаем проекты
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при создании проекта: ' + error.message);
    });
}

// Установка текущего пользователя как руководителя
function setCurrentUserAsManager() {
    const userId = localStorage.getItem('userId');
    const userData = localStorage.getItem('userData');
    let userName = 'Текущий пользователь';
    
    if (userData) {
        try {
            const user = JSON.parse(userData);
            userName = user.name || user.login || 'Текущий пользователь';
        } catch (e) {}
    }
    
    const managerDisplay = document.getElementById('projectManagerDisplay');
    const managerHidden = document.getElementById('projectManagerSelect');
    
    if (managerDisplay) {
        managerDisplay.value = userName;
    }
    if (managerHidden && userId) {
        managerHidden.value = userId;
    }
}

// Открытие модалки создания
function openCreateProjectModal() {
    setCurrentUserAsManager();
    loadCustomers();
    openModal('create-project-wrapper');
    
    setTimeout(() => {
        const input = document.getElementById('customerSearchInput');
        const list = document.getElementById('customerSearchList');
        const select = document.getElementById('customerSelect');
        if (input) input.value = '';
        if (list) list.style.display = 'none';
        if (select) select.innerHTML = '<option value="">Выберите заказчика</option>';
    }, 100);
}

// Редактирование проекта
// Редактирование проекта
function editProject(projectId) {
    console.log('Редактирование проекта:', projectId);
    const project = allProjects.find(p => p.id === projectId);
    
    if (!project) {
        alert('Проект не найден');
        return;
    }
    
    // Загружаем списки если еще не загружены
    if (allCustomers.length === 0) {
        loadCustomers();
    }
    if (allUsersList.length === 0) {
        loadAllUsers();
    }
    
    // Проверяем существование всех элементов
    const elements = {
        id: document.getElementById('edit-project-id'),
        name: document.getElementById('edit-project-name'),
        num: document.getElementById('edit-project-num'),
        budget: document.getElementById('edit-budget'),
        status: document.getElementById('edit-project-status'),
        startDate: document.getElementById('edit-start-date'),
        planningEndDate: document.getElementById('edit-planning-end-date'),
        endDate: document.getElementById('edit-end-date'),
        customerSearch: document.getElementById('edit-customer-search'),
        customerSelect: document.getElementById('edit-customer-select'),
        managerSearch: document.getElementById('edit-manager-search'),
        managerSelect: document.getElementById('edit-project-manager-select')
    };
    
    // Проверяем каждый элемент
    for (let [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`Элемент ${key} не найден в DOM`);
        }
    }
    
    // Заполняем форму данными проекта только если элементы существуют
    if (elements.id) elements.id.value = project.id;
    if (elements.name) elements.name.value = project.name || '';
    if (elements.num) elements.num.value = project.num || '';
    if (elements.budget) elements.budget.value = project.cost || '';
    
    // Заполняем статус
    if (elements.status) {
        let statusValue = project.status;
        console.log('Исходный статус из БД:', statusValue);
        
        // Преобразуем статусы из БД в статусы модалки
        if (statusValue === 3 || statusValue === 4) {
            statusValue = 2; // Завершен
        }
        elements.status.value = statusValue || 0;
        console.log('Установлен статус в модалке:', statusValue);
        
        // Удаляем старый обработчик если был
        elements.status.removeEventListener('change', statusChangeHandler);
        // Добавляем новый обработчик
        elements.status.addEventListener('change', statusChangeHandler);
        
        // Показываем/скрываем поле фактической даты
        toggleActualEndDate(statusValue);
    }
    
    // Заполняем даты
    if (project.startDate && elements.startDate) {
        elements.startDate.value = project.startDate.split('T')[0];
    }
    if (project.planningEndDate && elements.planningEndDate) {
        elements.planningEndDate.value = project.planningEndDate.split('T')[0];
    }
    if (project.endDate && elements.endDate) {
        elements.endDate.value = project.endDate.split('T')[0];
    }
    
    // Заполняем заказчика
    if (project.customerId && allCustomersCache[project.customerId]) {
        if (elements.customerSearch) elements.customerSearch.value = allCustomersCache[project.customerId];
        if (elements.customerSelect) {
            elements.customerSelect.innerHTML = `<option value="${project.customerId}" selected>${allCustomersCache[project.customerId]}</option>`;
        }
    }
    
    // Заполняем руководителя
    if (project.projectManagerId && allUsers[project.projectManagerId]) {
        if (elements.managerSearch) elements.managerSearch.value = allUsers[project.projectManagerId];
        if (elements.managerSelect) {
            elements.managerSelect.innerHTML = `<option value="${project.projectManagerId}" selected>${allUsers[project.projectManagerId]}</option>`;
        }
    }
    
    openModal('edit-project-wrapper');
}

// Выносим обработчик в отдельную функцию
function statusChangeHandler(event) {
    console.log('Статус изменен на:', event.target.value);
    toggleActualEndDate(parseInt(event.target.value));
}

// Показать/скрыть поле фактической даты
function toggleActualEndDate(status) {
    const actualDateGroup = document.getElementById('actual-end-date-group');
    const endDateField = document.getElementById('edit-end-date');
    
    if (actualDateGroup) {
        console.log('toggleActualEndDate вызван со статусом:', status);
        
        if (status === 2) { // Завершен
            console.log('Показываем поле фактической даты');
            actualDateGroup.style.display = 'block';
            if (endDateField) {
                endDateField.required = true;
            }
        } else {
            console.log('Скрываем поле фактической даты');
            actualDateGroup.style.display = 'none';
            if (endDateField) {
                endDateField.value = '';
                endDateField.required = false;
            }
        }
    } else {
        console.error('actual-end-date-group не найден в DOM');
    }
}

// Обновление проекта
// Обновление проекта
function updateProject(event) {
    event.preventDefault();
    
    const projectId = document.getElementById('edit-project-id').value;
    const customerSelect = document.getElementById('edit-customer-select');
    const managerSelect = document.getElementById('edit-project-manager-select');
    
    if (!customerSelect || !customerSelect.value) {
        alert('Выберите заказчика');
        return;
    }
    
    if (!managerSelect || !managerSelect.value) {
        alert('Выберите руководителя');
        return;
    }
    
    const startDate = document.getElementById('edit-start-date').value;
    const planningEndDate = document.getElementById('edit-planning-end-date').value;
    const endDate = document.getElementById('edit-end-date').value;
    const status = parseInt(document.getElementById('edit-project-status').value);
    
    // Проверка дат
    if (new Date(startDate) >= new Date(planningEndDate)) {
        alert('Дата начала должна быть раньше даты завершения');
        return;
    }
    
    // Проверка для статуса "Завершен"
    if (status === 2 && !endDate) {
        alert('Для завершенного проекта укажите фактическую дату завершения');
        return;
    }

    // Получаем значения полей
    const name = document.getElementById('edit-project-name').value.trim();
    const num = document.getElementById('edit-project-num').value.trim();
    const cost = document.getElementById('edit-budget').value;
    
    // Формируем объект с ID внутри тела запроса
    const projectData = {
        id: projectId,  // ID теперь здесь, а не в URL
        name: name || "Проект",
        num: num || "0",
        projectManagerId: managerSelect.value,
        customerId: customerSelect.value,
        status: status,
        startDate: formatDateForAPI(startDate),
        planningEndDate: formatDateForAPI(planningEndDate)
    };
    
    // Добавляем необязательные поля только если они есть
    if (endDate) {
        projectData.endDate = formatDateForAPI(endDate);
    }
    
    if (cost) {
        projectData.cost = parseInt(cost);
    }
    
    console.log('Обновление проекта:', projectData);
    
    // Отправляем PUT на /api/project без ID в URL
    fetch('https://dmitrii-golubev.ru:7000/api/project', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(projectData)
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
        console.log('Проект обновлен:', result);
        closeModal('edit-project-wrapper');
        alert('Проект успешно обновлен');
        loadProjects(); // Перезагружаем проекты
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при обновлении проекта: ' + error.message);
    });
}
// Открыть модалку управления исполнителями
function manageProjectMembers(projectId) {
    console.log('Управление исполнителями проекта:', projectId);
    const project = allProjects.find(p => p.id === projectId);
    
    if (!project) {
        alert('Проект не найден');
        return;
    }
    
    currentProjectForMembers = project;
    
    // Проверяем, загружена ли модалка
    const projectNameDisplay = document.getElementById('project-name-display');
    const projectNumDisplay = document.getElementById('project-num-display');
    
    if (!projectNameDisplay || !projectNumDisplay) {
        console.error('Элементы модалки не найдены. Возможно, модалка еще не загружена');
        alert('Ошибка загрузки формы управления исполнителями');
        return;
    }
    
    // Отображаем информацию о проекте
    projectNameDisplay.textContent = project.name || 'Без названия';
    projectNumDisplay.textContent = project.num ? `№${project.num}` : '';
    
    // Загружаем исполнителей проекта
    loadProjectMembers(projectId);
    
    // Загружаем всех доступных пользователей (только исполнителей)
    loadAvailableUsers();
    
    openModal('project-members-wrapper');
}

// Загрузка исполнителей проекта
function loadProjectMembers(projectId) {
    const listElement = document.getElementById('project-users-list');
    listElement.innerHTML = `
        <div class="loading-members">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Загрузка исполнителей...</p>
        </div>
    `;
    
    fetch(`https://dmitrii-golubev.ru:7000/api/project/${projectId}/users`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Ошибка загрузки: ${response.status}`);
        }
        return response.json();
    })
    .then(users => {
        console.log('Исполнители проекта:', users);
        displayProjectMembers(users);
        
        // После загрузки исполнителей, обновляем список доступных
        loadAvailableUsers();
    })
    .catch(error => {
        console.error('Ошибка загрузки исполнителей:', error);
        listElement.innerHTML = `
            <div class="empty-members">
                <i class="fas fa-exclamation-circle"></i>
                <p>Ошибка загрузки исполнителей</p>
                <small>${error.message}</small>
            </div>
        `;
    });
}

// Загрузка доступных пользователей (только исполнители, не в проекте)
function loadAvailableUsers() {
    const listElement = document.getElementById('available-users-list');
    
    fetch('https://dmitrii-golubev.ru:7000/api/user/all', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => response.json())
    .then(users => {
        console.log('Все пользователи:', users);
        
        // Фильтруем только исполнителей (role = 2)
        const executors = users.filter(user => user.role === 2 && user.isActive === true);
        
        // Получаем ID текущих исполнителей проекта из DOM
        const currentMembers = document.querySelectorAll('#project-users-list .member-item');
        const currentMemberIds = Array.from(currentMembers).map(item => item.dataset.userId);
        
        // Фильтруем тех, кто еще не в проекте
        const availableUsers = executors.filter(user => !currentMemberIds.includes(user.id));
        
        displayAvailableUsers(availableUsers);
    })
    .catch(error => {
        console.error('Ошибка загрузки пользователей:', error);
        listElement.innerHTML = `
            <div class="empty-members">
                <i class="fas fa-exclamation-circle"></i>
                <p>Ошибка загрузки пользователей</p>
            </div>
        `;
    });
}
// Получение класса для роли
function getRoleClass(role) {
    switch (Number(role)) {
        case 0: return 'role-admin';
        case 1: return 'role-manager';
        case 2: return 'role-executor';
        default: return '';
    }
}
// Отображение исполнителей проекта
// Отображение исполнителей проекта
function displayProjectMembers(members) {
    const listElement = document.getElementById('project-users-list');
    
    if (!members || members.length === 0) {
        listElement.innerHTML = `
            <div class="empty-members">
                <i class="fas fa-users-slash"></i>
                <p>В проекте нет исполнителей</p>
                <small>Добавьте исполнителей из списка слева</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    members.forEach(user => {
        const initials = (user.name || user.login || '?').substring(0, 2).toUpperCase();
        const roleClass = getRoleClass(user.role);
        const roleText = getRoleText(user.role);
        
        html += `
        <div class="member-item" data-user-id="${user.id}">
            <div class="member-info">
                <div class="member-avatar">${initials}</div>
                <div class="member-details">
                    <span class="member-name">${user.name || 'Без имени'}</span>
                    <span class="member-login">${user.login || 'no-login'}</span>
                    <span class="member-role-badge ${roleClass}">${roleText}</span>
                </div>
            </div>
            <div class="member-actions">
                <button class="btn-member btn-remove" onclick="removeMemberFromProject('${user.id}')" title="Удалить из проекта">
                    <i class="fas fa-user-minus"></i>
                </button>
            </div>
        </div>
        `;
    });
    
    listElement.innerHTML = html;
}

// Отображение доступных пользователей
function displayAvailableUsers(users) {
    const listElement = document.getElementById('available-users-list');
    
    if (!users || users.length === 0) {
        listElement.innerHTML = `
            <div class="empty-members">
                <i class="fas fa-user-plus"></i>
                <p>Нет доступных исполнителей</p>
                <small>Все исполнители уже добавлены в проект</small>
            </div>
        `;
        return;
    }
    
    let html = '';
    users.forEach(user => {
        const initials = (user.name || user.login || '?').substring(0, 2).toUpperCase();
        const roleClass = getRoleClass(user.role);
        const roleText = getRoleText(user.role);
        
        html += `
        <div class="member-item" data-user-id="${user.id}">
            <div class="member-info">
                <div class="member-avatar">${initials}</div>
                <div class="member-details">
                    <span class="member-name">${user.name || 'Без имени'}</span>
                    <span class="member-login">${user.login || 'no-login'}</span>
                    <span class="member-role-badge ${roleClass}">${roleText}</span>
                </div>
            </div>
            <div class="member-actions">
                <button class="btn-member btn-add" onclick="addMemberToProject('${user.id}')" title="Добавить в проект">
                    <i class="fas fa-user-plus"></i>
                </button>
            </div>
        </div>
        `;
    });
    
    listElement.innerHTML = html;
}
// Добавление исполнителя в проект
function addMemberToProject(userId) {
    if (!currentProjectForMembers) {
        alert('Проект не выбран');
        return;
    }
    
    const data = {
        projectId: currentProjectForMembers.id,
        userId: userId
    };
    
    console.log('Добавление исполнителя:', data);
    
    fetch('https://dmitrii-golubev.ru:7000/api/user-project', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
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
        console.log('Исполнитель добавлен:', result);
        // Перезагружаем оба списка
        loadProjectMembers(currentProjectForMembers.id);
        loadAvailableUsers();
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при добавлении исполнителя: ' + error.message);
    });
}

// Получение ID связи пользователя с проектом
function getUserProjectId(userId, projectId) {
    return fetch(`https://dmitrii-golubev.ru:7000/api/user-project/user/${userId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Ошибка получения связей пользователя: ${response.status}`);
        }
        return response.json();
    })
    .then(relations => {
        console.log('Связи пользователя:', relations);
        // Ищем связь с нужным проектом
        const relation = relations.find(r => r.projectId === projectId);
        if (!relation) {
            throw new Error('Связь не найдена');
        }
        return relation.id;
    });
}

// Удаление исполнителя из проекта
function removeMemberFromProject(userId) {
    if (!currentProjectForMembers) {
        alert('Проект не выбран');
        return;
    }
    
    if (!confirm('Удалить исполнителя из проекта?')) {
        return;
    }
    
    console.log('Удаление исполнителя:', userId, 'из проекта:', currentProjectForMembers.id);
    
    // Сначала получаем ID связи
    getUserProjectId(userId, currentProjectForMembers.id)
    .then(relationId => {
        console.log('ID связи для удаления:', relationId);
        
        // Удаляем по ID связи
        return fetch(`https://dmitrii-golubev.ru:7000/api/user-project/${relationId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || `Ошибка ${response.status}`);
            });
        }
        console.log('Исполнитель удален');
        // Перезагружаем оба списка
        loadProjectMembers(currentProjectForMembers.id);
        loadAvailableUsers();
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении исполнителя: ' + error.message);
    });
}
// Поиск по доступным пользователям
function searchAvailableUsers() {
    const searchTerm = document.getElementById('available-users-search').value.toLowerCase();
    const items = document.querySelectorAll('#available-users-list .member-item');
    
    items.forEach(item => {
        const name = item.querySelector('.member-name')?.textContent.toLowerCase() || '';
        const login = item.querySelector('.member-login')?.textContent.toLowerCase() || '';
        
        if (name.includes(searchTerm) || login.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Поиск по исполнителям проекта
function searchProjectUsers() {
    const searchTerm = document.getElementById('project-users-search').value.toLowerCase();
    const items = document.querySelectorAll('#project-users-list .member-item');
    
    items.forEach(item => {
        const name = item.querySelector('.member-name')?.textContent.toLowerCase() || '';
        const login = item.querySelector('.member-login')?.textContent.toLowerCase() || '';
        
        if (name.includes(searchTerm) || login.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

// Получение текста роли
function getRoleText(role) {
    const roles = {
        0: 'Администратор',
        1: 'Руководитель',
        2: 'Исполнитель'
    };
    return roles[role] || 'Пользователь';
}

// Поиск заказчика в модалке редактирования
function searchEditCustomer() {
    const input = document.getElementById('edit-customer-search');
    const list = document.getElementById('edit-customer-search-list');
    
    if (!input || !list) return;
    
    const searchTerm = input.value.toLowerCase();
    
    list.innerHTML = '';
    list.style.display = 'none';
    
    if (!searchTerm || searchTerm.length < 1) return;
    
    const filtered = allCustomers.filter(c => 
        c.name.toLowerCase().includes(searchTerm)
    );
    
    if (filtered.length === 0) {
        const div = document.createElement('div');
        div.className = 'search-item disabled';
        div.textContent = 'Ничего не найдено';
        list.appendChild(div);
        list.style.display = 'block';
        return;
    }
    
    filtered.slice(0, 5).forEach(c => {
        const div = document.createElement('div');
        div.className = 'search-item';
        div.textContent = c.name;
        div.onclick = () => {
            input.value = c.name;
            const select = document.getElementById('edit-customer-select');
            select.innerHTML = `<option value="${c.id}" selected>${c.name}</option>`;
            list.style.display = 'none';
        };
        list.appendChild(div);
    });
    
    list.style.display = 'block';
}

// Поиск руководителя в модалке редактирования
function searchEditManager() {
    const input = document.getElementById('edit-manager-search');
    const list = document.getElementById('edit-manager-search-list');
    
    if (!input || !list) return;
    
    const searchTerm = input.value.toLowerCase();
    
    list.innerHTML = '';
    list.style.display = 'none';
    
    if (!searchTerm || searchTerm.length < 1) return;
    
    const filtered = allUsersList.filter(u => 
        (u.name && u.name.toLowerCase().includes(searchTerm)) || 
        (u.login && u.login.toLowerCase().includes(searchTerm))
    );
    
    if (filtered.length === 0) {
        const div = document.createElement('div');
        div.className = 'search-item disabled';
        div.textContent = 'Ничего не найдено';
        list.appendChild(div);
        list.style.display = 'block';
        return;
    }
    
    filtered.slice(0, 5).forEach(u => {
        const displayName = u.name || u.login || 'Без имени';
        const div = document.createElement('div');
        div.className = 'search-item';
        div.textContent = displayName;
        div.onclick = () => {
            input.value = displayName;
            const select = document.getElementById('edit-project-manager-select');
            select.innerHTML = `<option value="${u.id}" selected>${displayName}</option>`;
            list.style.display = 'none';
        };
        list.appendChild(div);
    });
    
    list.style.display = 'block';
}

// Удаление проекта
function deleteProject(projectId) {
    if (confirm('Вы уверены, что хотите удалить проект?')) {
        console.log('Удаление проекта:', projectId);
        
        fetch(`https://dmitrii-golubev.ru:7000/api/project/${projectId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка ${response.status}`);
            }
            alert('Проект успешно удален');
            loadProjects(); // Перезагружаем проекты
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Ошибка при удалении проекта: ' + error.message);
        });
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('projectsGrid')) {
        loadProjects();
        loadCustomers();
        loadAllUsers();
    }
});

// Скрываем списки при клике вне
document.addEventListener('click', function(e) {
    // Для основной модалки
    const container = document.querySelector('.search-container');
    if (container && !container.contains(e.target)) {
        const list = document.getElementById('customerSearchList');
        if (list) list.style.display = 'none';
    }
    
    // Для модалки редактирования
    const editContainer = document.querySelector('#edit-project-wrapper .search-container');
    if (editContainer && !editContainer.contains(e.target)) {
        const list = document.getElementById('edit-customer-search-list');
        if (list) list.style.display = 'none';
        
        const managerList = document.getElementById('edit-manager-search-list');
        if (managerList) managerList.style.display = 'none';
    }
});

// Открыть модалку управления статусами
function manageProjectStatuses(projectId) {
    console.log('Управление статусами проекта:', projectId);
    const project = allProjects.find(p => p.id === projectId);
    
    if (!project) {
        alert('Проект не найден');
        return;
    }
    
    currentProjectForStatuses = project;
    
    // Отображаем информацию о проекте
    document.getElementById('status-project-name-display').textContent = project.name || 'Без названия';
    document.getElementById('status-project-num-display').textContent = project.num ? `№${project.num}` : '';
    
    // Загружаем статусы проекта
    loadProjectStatuses(projectId);
    
    openModal('project-statuses-wrapper');
}

// Загрузка статусов проекта
// Загрузка статусов проекта
function loadProjectStatuses(projectId) {
    const listElement = document.getElementById('project-statuses-list');
    listElement.innerHTML = `
        <div class="loading-statuses">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Загрузка статусов...</p>
        </div>
    `;
    
    // Получаем статусы проекта
    fetch(`https://dmitrii-golubev.ru:7000/api/project/${projectId}/statuses`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Ошибка загрузки статусов: ${response.status}`);
        }
        return response.json();
    })
    .then(statuses => {
        console.log('Статусы проекта:', statuses);
        
        // Получаем задачи проекта для подсчета
        return fetch(`https://dmitrii-golubev.ru:7000/api/project/${projectId}/tasks`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => response.json())
        .then(tasks => {
            // Считаем задачи для каждого статуса
            const tasksCount = {};
            tasks.forEach(task => {
                if (task.statusId) {
                    tasksCount[task.statusId] = (tasksCount[task.statusId] || 0) + 1;
                }
            });
            
            displayProjectStatuses(statuses, tasksCount);
        });
    })
    .catch(error => {
        console.error('Ошибка загрузки статусов:', error);
        listElement.innerHTML = `
            <div class="empty-statuses">
                <i class="fas fa-exclamation-circle"></i>
                <p>Ошибка загрузки статусов</p>
                <small>${error.message}</small>
            </div>
        `;
    });
}

// Отображение статусов проекта
// Отображение статусов проекта
// Отображение статусов проекта
function displayProjectStatuses(statuses, tasksCount = {}) {
    const listElement = document.getElementById('project-statuses-list');
    
    if (!statuses || statuses.length === 0) {
        listElement.innerHTML = `
            <div class="empty-statuses">
                <i class="fas fa-tasks"></i>
                <p>Нет статусов</p>
                <small>Создайте первый статус для задач</small>
            </div>
        `;
        return;
    }
    
    // Сортируем по order
    const sortedStatuses = [...statuses].sort((a, b) => (a.order || 0) - (b.order || 0));
    
    let html = '';
    sortedStatuses.forEach((status, index) => {
        const taskCount = tasksCount[status.id] || 0;
        const hasTasks = taskCount > 0;
        // Показываем пользователю порядок с 1, но в API отправляем с 0
        const displayOrder = index + 1;
        const apiOrder = status.order || 0;
        
        html += `
        <div class="status-item" data-status-id="${status.id}">
            <div class="status-info" style="display: flex;">
                <div class="status-order" title="Позиция на доске: ${displayOrder}">${displayOrder}</div>
                <div class="status-details">
                    <div class="status-name">${status.name || 'Без названия'}</div>
                    <div class="status-meta">
                        <span class="status-order-info">Позиция: ${displayOrder}</span>
                        ${taskCount > 0 ? `<span class="status-tasks-count">${taskCount} задач</span>` : ''}
                    </div>
                </div>
            </div>
            
            <div class="status-actions" style="display: flex;">
                <button class="btn-status btn-edit-status" onclick="editProjectStatus('${status.id}')" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-status btn-delete-status" onclick="deleteProjectStatus('${status.id}')" 
                        ${hasTasks ? 'disabled' : ''} title="${hasTasks ? 'Нельзя удалить статус с задачами' : 'Удалить статус'}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            
            <!-- Форма редактирования (скрыта по умолчанию) -->
            <div class="status-edit-form" style="display: none; flex: 1; gap: 10px; align-items: center;">
                <input type="text" class="edit-status-name" value="${status.name || ''}" placeholder="Название статуса" style="flex: 2;">
                <div style="flex: 1; display: flex; flex-direction: column;">
                    <input type="number" class="edit-status-order" value="${displayOrder}" placeholder="Позиция" min="1" style="width: 100%;">
                </div>
                <button class="btn-status btn-save-status" onclick="saveStatusEdit('${status.id}')" title="Сохранить">
                    <i class="fas fa-check"></i>
                </button>
                <button class="btn-status btn-cancel-status" onclick="cancelStatusEdit('${status.id}')" title="Отмена">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
        `;
    });
    
    listElement.innerHTML = html;
}

// Добавление нового статуса
// Добавление нового статуса
function addProjectStatus() {
    if (!currentProjectForStatuses) {
        alert('Проект не выбран');
        return;
    }
    
    const nameInput = document.getElementById('new-status-name');
    const orderInput = document.getElementById('new-status-order');
    
    const name = nameInput.value.trim();
    // Преобразуем пользовательский порядок (с 1) в API порядок (с 0)
    const displayOrder = parseInt(orderInput.value) || 1;
    const apiOrder = displayOrder - 1;
    
    if (!name) {
        alert('Введите название статуса');
        return;
    }
    
    const statusData = {
        name: name,
        projectId: currentProjectForStatuses.id,
        order: apiOrder
    };
    
    console.log('Добавление статуса:', statusData);
    
    fetch('https://dmitrii-golubev.ru:7000/api/status', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(statusData)
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
        console.log('Статус добавлен:', result);
        nameInput.value = '';
        orderInput.value = '1';
        loadProjectStatuses(currentProjectForStatuses.id);
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при добавлении статуса: ' + error.message);
    });
}

// Редактирование статуса
function editProjectStatus(statusId) {
    console.log('Редактирование статуса:', statusId);
    const statusItem = document.querySelector(`.status-item[data-status-id="${statusId}"]`);
    if (statusItem) {
        // Скрываем блок с информацией
        const infoBlock = statusItem.querySelector('.status-info');
        const editForm = statusItem.querySelector('.status-edit-form');
        const actions = statusItem.querySelector('.status-actions');
        
        if (infoBlock) infoBlock.style.display = 'none';
        if (actions) actions.style.display = 'none';
        if (editForm) editForm.style.display = 'flex';
    }
}

// Сохранение редактирования статуса
// Сохранение редактирования статуса
function saveStatusEdit(statusId) {
    console.log('Сохранение статуса:', statusId);
    const statusItem = document.querySelector(`.status-item[data-status-id="${statusId}"]`);
    if (!statusItem) return;
    
    const nameInput = statusItem.querySelector('.edit-status-name');
    const orderInput = statusItem.querySelector('.edit-status-order');
    
    const name = nameInput.value.trim();
    // Преобразуем пользовательский порядок (с 1) в API порядок (с 0)
    const displayOrder = parseInt(orderInput.value) || 1;
    const apiOrder = displayOrder - 1;
    
    if (!name) {
        alert('Введите название статуса');
        return;
    }
    
    const statusData = {
        id: statusId,
        name: name,
        projectId: currentProjectForStatuses.id,
        order: apiOrder
    };
    
    console.log('Обновление статуса:', statusData);
    
    fetch('https://dmitrii-golubev.ru:7000/api/status', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(statusData)
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
        console.log('Статус обновлен:', result);
        loadProjectStatuses(currentProjectForStatuses.id);
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при обновлении статуса: ' + error.message);
    });
}
// Отмена редактирования статуса
function cancelStatusEdit(statusId) {
    console.log('Отмена редактирования статуса:', statusId);
    const statusItem = document.querySelector(`.status-item[data-status-id="${statusId}"]`);
    if (statusItem) {
        const infoBlock = statusItem.querySelector('.status-info');
        const editForm = statusItem.querySelector('.status-edit-form');
        const actions = statusItem.querySelector('.status-actions');
        
        if (infoBlock) infoBlock.style.display = 'flex';
        if (actions) actions.style.display = 'flex';
        if (editForm) editForm.style.display = 'none';
    }
}

// Отмена редактирования статуса
function cancelStatusEdit(statusId) {
    const statusItem = document.querySelector(`.status-item[data-status-id="${statusId}"]`);
    if (statusItem) {
        statusItem.classList.remove('edit-mode');
    }
}

// Удаление статуса
function deleteProjectStatus(statusId) {
    if (!currentProjectForStatuses) {
        alert('Проект не выбран');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите удалить этот статус?')) {
        return;
    }
    
    console.log('Удаление статуса:', statusId);
    
    fetch(`https://dmitrii-golubev.ru:7000/api/status/${statusId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || `Ошибка ${response.status}`);
            });
        }
        console.log('Статус удален');
        loadProjectStatuses(currentProjectForStatuses.id);
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении статуса: ' + error.message);
    });
}

// Делаем функции глобальными
window.createProject = createProject;
window.searchCustomer = searchCustomer;
window.openCreateProjectModal = openCreateProjectModal;
window.loadProjects = loadProjects;
window.editProject = editProject;
window.updateProject = updateProject;
window.deleteProject = deleteProject;
window.searchEditCustomer = searchEditCustomer;
window.searchEditManager = searchEditManager;
window.manageProjectMembers = manageProjectMembers; // <-- Добавьте эту строку
window.addMemberToProject = addMemberToProject;
window.removeMemberFromProject = removeMemberFromProject;
window.searchAvailableUsers = searchAvailableUsers;
window.searchProjectUsers = searchProjectUsers;
window.manageProjectStatuses = manageProjectStatuses;
window.addProjectStatus = addProjectStatus;
window.editProjectStatus = editProjectStatus;
window.saveStatusEdit = saveStatusEdit;
window.cancelStatusEdit = cancelStatusEdit;
window.deleteProjectStatus = deleteProjectStatus;