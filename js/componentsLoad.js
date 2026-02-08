// Загрузка всех компонентов в main

const components = {
    sidebar: './components/sidebar.html',
    header: './components/header.html',
    signIn: './css/components/modals/signIn.html',
    signUp: './css/components/modals/signUp.html',
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
        return false;
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const loadPromises = [];
    
    if (document.getElementById('sidebar')) {
        loadPromises.push(loadComponent('sidebar', './components/sidebar.html'));
    }
    
    if (document.getElementById('header')) {
        loadPromises.push(loadComponent('header', './components/header.html'));
    }

    if (document.getElementById('signin')) {
        loadPromises.push(loadComponent('signin', './css/components/modals/signIn.html'));
    }

    if (document.getElementById('signup')) {
        loadPromises.push(loadComponent('signup', './css/components/modals/signUp.html'));
    }
    
    Promise.all(loadPromises).then(() => {
        setTimeout(() => {
            document.body.classList.add('page-loaded');
            initmodalswitchers();
        }, 300);
    });
});