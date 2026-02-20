// Загрузка всех компонентов в main
const COMPONENTS = {
    sidebar: 'components/sidebar.html',
    header: 'components/header.html',
    signIn: 'components/modals/signIn.html',
    signUp: 'components/modals/signUp.html',
    projects: 'components/pages/projects.html',
    admin: 'components/pages/adminPanel.html',
    tasks: 'components/pages/tasks.html',
    createProject: 'components/modals/createProject.html',
    deleteProject: 'components/modals/deleteProject.html',
    editProject: 'components/modals/editProject.html',
    task: 'components/modals/Task.html',
    editUser: 'components/modals/editUser.html'
};

// Функция загрузки компонента
async function loadComponent(componentId, componentPath) {
    try {
        const response = await fetch(componentPath);
        
        const html = await response.text();
        const container = document.getElementById(componentId);
        
        if (container) {
            container.innerHTML = html;
            return true;
        }
    } catch (error) {
        console.error('Ошибка загрузки компонента:', error);
        return false;
    }
}

// Функция переключения страниц
function initPageSwitcher() {
    // Маппинг названий страниц
    const pageTitles = {
        'dashboard': 'Главная панель',
        'admin': 'Администрирование',
        'projects': 'Управление проектами',
        'tasks': 'Задачи',
        'users': 'Исполнители',
        'reports': 'Отчеты'
    };
    
    // Вешаем обработчики на пункты меню
    document.addEventListener('click', function(e) {
        // Проверяем, кликнули ли на пункт меню в сайдбаре
        const navItem = e.target.closest('.nav-menu li[data-page]');
        if (!navItem) return;
        
        const pageId = navItem.dataset.page;
        console.log('Клик по пункту меню:', pageId);
        
        // Обновляем заголовок страницы
        updatePageTitle(pageId, pageTitles);
        
        // Убираем активный класс у всех пунктов меню
        document.querySelectorAll('.nav-menu li').forEach(item => {
            item.classList.remove('active');
        });
        
        // Добавляем активный класс текущему пункту
        navItem.classList.add('active');
        
        // Скрываем все страницы
        document.querySelectorAll('.page').forEach(page => {
            page.style.display = 'none';
            page.classList.remove('active');
        });
        
        // Показываем нужную страницу
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.style.display = 'block';
            targetPage.classList.add('active');
            console.log('Страница показана:', pageId);
        } else {
            console.log('Страница не найдена:', pageId);
        }
    });
}

// Функция обновления заголовка
function updatePageTitle(pageId, titlesMap) {
    const pageTitleElement = document.getElementById('page-title');
    if (pageTitleElement) {
        // Получаем название из маппинга или используем pageId как fallback
        const title = titlesMap[pageId] || pageId;
        pageTitleElement.textContent = title;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const loadPromises = [];
    
    // Загружаем компоненты
    if (document.getElementById('sidebar')) {
        loadPromises.push(loadComponent('sidebar', 'components/sidebar.html'));
    }
    
    if (document.getElementById('header')) {
        loadPromises.push(loadComponent('header', 'components/header.html'));
    }

    if (document.getElementById('createProject')) {
        loadPromises.push(loadComponent('createProject', 'components/modals/createProject.html'));
    }

    if (document.getElementById('deleteProject')) {
        loadPromises.push(loadComponent('deleteProject', 'components/modals/deleteProject.html'));
    }

    if (document.getElementById('editProject')) {
        loadPromises.push(loadComponent('editProject', 'components/modals/editProject.html'));
    }

    if (document.getElementById('editUser')) {
        loadPromises.push(loadComponent('editProject', 'components/modals/editUser.html'));
    }

    if (document.getElementById('signin')) {
        loadPromises.push(loadComponent('signin', 'components/modals/signIn.html'));
    }

    if (document.getElementById('signup')) {
        loadPromises.push(loadComponent('signup', 'components/modals/signUp.html'));
    }

    if (document.getElementById('admin')) {
        loadPromises.push(loadComponent('admin', 'components/pages/adminPanel.html'));
    }

    if (document.getElementById('projects')) {
        loadPromises.push(loadComponent('projects', 'components/pages/projects.html'));
    }

    if (document.getElementById('tasks')) {
        loadPromises.push(loadComponent('tasks', 'components/pages/tasks.html'));
    }

    if (document.getElementById('task')){
        loadPromises.push(loadComponent('task', 'components/modals/task.html'))
    }
    Promise.all(loadPromises).then(() => {
        console.log('Все компоненты загружены');
        
        setTimeout(() => {
            document.body.classList.add('page-loaded');
            initPageSwitcher(); // Инициализируем переключатель
            
            if (typeof initModalSwitchers === 'function') {
                initModalSwitchers();
            }
        }, 300);
    }).catch(error => {
        console.error('Ошибка загрузки:', error);
    });
});