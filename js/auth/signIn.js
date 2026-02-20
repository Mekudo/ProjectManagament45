let signInFormInitialized = false;

function initSignInForm() {
    if (signInFormInitialized) {
        console.log('Форма уже инициализирована, пропускаю...');
        return;
    }
    
    const signinForm = document.getElementById('signin-form');
    const loginInput = document.getElementById('loginInput');
    const passwordInput = document.getElementById('passwordInput');
    
    if (!signinForm || !loginInput || !passwordInput) {
        setTimeout(initSignInForm, 100);
        return;
    }
    
    signInFormInitialized = true;
    
    signinForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const login = loginInput.value;
        const password = passwordInput.value;
        
        const submitBtn = this.querySelector('.btn-submit');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('https://dmitrii-golubev.ru:7000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    login: login,
                    password: password
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('✓ Успешный ответ от сервера:', data);
            
            // используем authUI для сохранения данных
            if (window.authUI && window.authUI.login) {
                window.authUI.login({
                    token: data.token,
                    refreshToken: data.refreshToken,
                    expiresAt: data.expiresAt,
                    userId: data.userId,
                    login: login
                });
            }
            
            closeModal('sign-in-wrapper');
            
            loginInput.value = '';
            passwordInput.value = '';
            
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            alert(`Успешный вход! Добро пожаловать, ${login}`);
            
        } catch (error) {
            console.error('✗ Ошибка входа:', error);
            
            let errorMessage = 'Ошибка входа';
            if (error.message.includes('401')) {
                errorMessage = 'Неверный логин или пароль';
            } else if (error.message.includes('network') || error.message.includes('Failed to fetch')) {
                errorMessage = 'Ошибка соединения с сервером';
            } else {
                errorMessage = error.message;
            }
            
            alert(errorMessage);
            
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

function initializeAuth() {
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initSignInForm, 300);
        });
    } else {
        setTimeout(initSignInForm, 300);
    }
}

initializeAuth();