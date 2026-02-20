class AuthFlow {
    constructor() {
        this.init();
    }

    init() {
        // Проверяем авторизацию при загрузке
        if (this.isAuthenticated()) {
            this.showMainApp();
        } else {
            this.showAuthModal();
        }

        // Слушаем события
        document.addEventListener('authSuccess', () => {
            this.showMainApp();
        });
    }

    isAuthenticated() {
        return !!localStorage.getItem('token');
    }

    showAuthModal() {
        // Убираем класс авторизации с контейнера
        const container = document.querySelector('.container');
        if (container) {
            container.classList.remove('auth-ok');
        }

        // Активируем модалку входа
        setTimeout(() => {
            const signinModal = document.getElementById('signin');
            if (signinModal) {
                signinModal.classList.add('active');
            }
            
            if (typeof openModal === 'function') {
                openModal('sign-in-wrapper');
            }
        }, 50);
    }

    showMainApp() {
        // Добавляем класс авторизации на контейнер
        const container = document.querySelector('.container');
        if (container) {
            container.classList.add('auth-ok');
        }

        // Скрываем модалки
        const signinModal = document.getElementById('signin');
        if (signinModal) {
            signinModal.classList.remove('active');
        }

        if (typeof closeModal === 'function') {
            closeModal('sign-in-wrapper');
            closeModal('sign-up-wrapper');
        }
    }
}

// Переопределяем logout в AuthUI
document.addEventListener('DOMContentLoaded', () => {
    // Сохраняем оригинальный logout
    const originalLogout = AuthUI.prototype.logout;
    
    // Переопределяем
    AuthUI.prototype.logout = function() {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('expiresAt');
        localStorage.removeItem('userId');
        localStorage.removeItem('userLogin');
        localStorage.removeItem('userData');
        localStorage.removeItem('userRole');
        
        this.updateUI();
        
        alert('Вы вышли из системы');
        
        // Показываем модалку
        if (window.authFlow) {
            window.authFlow.showAuthModal();
        }
    };

    window.authFlow = new AuthFlow();
});

// Добавляем событие в login
document.addEventListener('authSuccess', () => {
    if (window.authFlow) {
        window.authFlow.showMainApp();
    }
});