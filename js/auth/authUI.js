class AuthUI {
    constructor() {
        this.loginBtn = null;
        this.logoutBtn = null;
        this.userInfo = null;
        this.userName = null;
        this.userRole = null;
        
        this.init();
    }
    
    async init() {
        await this.waitForElements();
        
        // Если пользователь авторизован, загружаем полные данные
        if (this.isAuthenticated()) {
            await this.loadUserDetails();
        }
        
        this.updateUI();
        this.setupEventListeners();
    }
    
    waitForElements() {
        return new Promise(resolve => {
            const checkElements = () => {
                this.loginBtn = document.getElementById('login-btn');
                this.logoutBtn = document.getElementById('logoutBtn');
                this.userInfo = document.getElementById('userInfo');
                this.userName = document.getElementById('userName');
                this.userRole = document.getElementById('userRole');
                
                if (this.loginBtn || this.logoutBtn || this.userInfo) {
                    resolve();
                } else {
                    setTimeout(checkElements, 100);
                }
            };
            checkElements();
        });
    }
    
    isAuthenticated() {
        return !!localStorage.getItem('token');
    }
    
    getUserData() {
        const userDataStr = localStorage.getItem('userData');
        if (userDataStr) {
            try {
                return JSON.parse(userDataStr);
            } catch (e) {
                console.error('Ошибка парсинга userData:', e);
            }
        }
        return null;
    }
    
    // Новый метод для загрузки детальной информации о пользователе
    async loadUserDetails() {
        const token = localStorage.getItem('token');
        const userId = localStorage.getItem('userId');
        
        if (!token || !userId) {
            console.error('Нет токена или ID пользователя');
            return null;
        }
        
        try {
            const response = await fetch(`https://dmitrii-golubev.ru:7000/api/user/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Ошибка загрузки данных: ${response.status}`);
            }
            
            const userDetails = await response.json();
            console.log('Детальные данные пользователя:', userDetails);
            
            // Обновляем данные в localStorage с полной информацией
            const currentUserData = this.getUserData() || {};
            const updatedUserData = {
                ...currentUserData,
                id: userDetails.id,
                login: userDetails.login,
                name: userDetails.name,
                role: this.getRoleName(userDetails.role), // Преобразуем число в название роли
                roleNumber: userDetails.role // Сохраняем числовое значение
            };
            
            localStorage.setItem('userData', JSON.stringify(updatedUserData));
            localStorage.setItem('userRole', updatedUserData.role);
            localStorage.setItem('userName', userDetails.name);
            
            return updatedUserData;
            
        } catch (error) {
            console.error('Ошибка загрузки детальных данных пользователя:', error);
            return null;
        }
    }
    
    // Преобразование числовой роли в название
    getRoleName(roleNumber) {
        switch (roleNumber) {
            case 0:
                return 'Администратор';
            case 1:
                return 'Руководитель проекта';
            case 2:
                return 'Исполнитель';
            default:
                return 'Пользователь';
        }
    }
    
    // Обновленный updateUI с использованием полных данных
    updateUI() {
        const isAuth = this.isAuthenticated();
        const userData = this.getUserData();
        
        console.log('Авторизован:', isAuth, 'Данные:', userData);
        
        if (this.loginBtn) {
            this.loginBtn.style.display = isAuth ? 'none' : 'flex';
        }
        
        if (this.logoutBtn) {
            this.logoutBtn.style.display = isAuth ? 'flex' : 'none';
        }
        
        if (this.userInfo) {
            this.userInfo.style.display = isAuth ? 'flex' : 'none';
        }
        
        if (this.userName && userData) {
            // Показываем имя, если есть, иначе логин
            this.userName.textContent = userData.name || userData.login || 'Пользователь';
        }
        
        if (this.userRole && userData) {
            this.userRole.textContent = userData.role || 'Пользователь';
        }

        // Показываем пункт меню "Администрирование" только для администратора (role = 0)
        const adminMenuItem = document.querySelector('.nav-menu li[data-page="admin"]');
        if (adminMenuItem) {
            const isAdmin = userData && (userData.roleNumber === 0 || userData.role === 'Администратор');
            adminMenuItem.style.display = isAuth && isAdmin ? 'flex' : 'none';
        }
    }
    
    setupEventListeners() {
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.logout());
        }
    }
    
    async login(userData) {
        // Сохраняем базовые данные
        localStorage.setItem('token', userData.token);
        localStorage.setItem('refreshToken', userData.refreshToken);
        localStorage.setItem('expiresAt', userData.expiresAt);
        localStorage.setItem('userId', userData.userId);
        localStorage.setItem('userLogin', userData.login);
        
        const userDataForStorage = {
            login: userData.login,
            userId: userData.userId,
            expiresAt: userData.expiresAt,
            role: 'Пользователь' // Временная роль
        };
        localStorage.setItem('userData', JSON.stringify(userDataForStorage));
        
        // Загружаем детальные данные
        await this.loadUserDetails();
        
        this.updateUI();
        
        if (typeof closeModal === 'function') {
            closeModal('sign-in-wrapper');
        }

        document.dispatchEvent(new Event('authSuccess'));
    }
    
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('expiresAt');
        localStorage.removeItem('userId');
        localStorage.removeItem('userLogin');
        localStorage.removeItem('userData');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        
        this.updateUI();
        
        alert('Вы вышли из системы');
        window.location.reload();
    }
    
    // Вспомогательный метод для получения токена
    getToken() {
        return localStorage.getItem('token');
    }
    
    // Вспомогательный метод для получения полных данных пользователя
    getCurrentUser() {
        return this.getUserData();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.authUI = new AuthUI();
});