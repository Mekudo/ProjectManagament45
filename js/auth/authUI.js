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
            this.userName.textContent = userData.login || 'Пользователь';
        }
        
        if (this.userRole && userData) {
            this.userRole.textContent = userData.role || 'Пользователь';
        }
    }
    
    setupEventListeners() {
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.logout());
        }
    }
    
    login(userData) {
        localStorage.setItem('token', userData.token);
        localStorage.setItem('refreshToken', userData.refreshToken);
        localStorage.setItem('expiresAt', userData.expiresAt);
        localStorage.setItem('userId', userData.userId);
        localStorage.setItem('userLogin', userData.login);
        
        if (userData.role) {
            localStorage.setItem('userRole', userData.role);
        }
        
        const userDataForStorage = {
            login: userData.login,
            userId: userData.userId,
            expiresAt: userData.expiresAt,
            role: userData.role || 'Пользователь'
        };
        localStorage.setItem('userData', JSON.stringify(userDataForStorage));
        
        this.updateUI();
        
        if (typeof closeModal === 'function') {
            closeModal('sign-in-wrapper');
        }
    }
    
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('expiresAt');
        localStorage.removeItem('userId');
        localStorage.removeItem('userLogin');
        localStorage.removeItem('userData');
        localStorage.removeItem('userRole');
        
        this.updateUI();
        
        alert('Вы вышли из системы');
        window.location.reload();
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.authUI = new AuthUI();
});