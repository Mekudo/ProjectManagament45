let signUpFormInitialized = false;

function initSignUpForm() {
    if (signUpFormInitialized) {
        return;
    }
    
    const signupForm = document.getElementById('signup-form');
    if (!signupForm) {
        setTimeout(initSignUpForm, 100);
        return;
    }
    
    signUpFormInitialized = true;
    
    const nameInput = document.getElementById('nameInput');
    const loginInput = document.getElementById('loginInputUp');
    const passwordInput = document.getElementById('passwordInputUp');
    const confirmPasswordInput = document.getElementById('confirmPasswordInput');
    const roleInput = document.getElementById('roleSelect');

    if (!nameInput || !loginInput || !passwordInput || !confirmPasswordInput) {
        console.error('Не все поля формы найдены');
        return;
    }
    
    signupForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = nameInput.value.trim();
        const login = loginInput.value.trim();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const role = roleInput.value;
        
        if (!name || !login || !password || !confirmPassword || !role) {
            alert('Все поля обязательны для заполнения');
            return;
        }
        
        if (password.length < 8) {
            alert('Пароль должен содержать минимум 8 символов');
            return;
        }
        
        if (password !== confirmPassword) {
            alert('Пароли не совпадают');
            return;
        }
        
        const loginRegex = /^[a-zA-Z0-9_]+$/;
        if (!loginRegex.test(login)) {
            alert('Логин может содержать только латинские буквы, цифры и символ подчеркивания');
            return;
        }
        
        const submitBtn = this.querySelector('.btn-submit');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Регистрация...';
        submitBtn.disabled = true;
       
        let roleNumber;
        switch (role) {
            case 'admin':
                roleNumber = 0;
                break;
            case 'projectManager':
                roleNumber = 1;
                break;
            case 'executor':
                roleNumber = 2;
                break;
            default:
                alert('Выбрана некорректная роль');
                return;
        }

        try {
            const token = localStorage.getItem('token');

            const response = await fetch('https://dmitrii-golubev.ru:7000/api/user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: name,
                    login: login,
                    password: password,
                    role: roleNumber,
                })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Ошибка ${response.status}: ${errorText}`);
            }
            
            const data = await response.json();
            console.log('✓ Успешная регистрация:', data);
            
            closeModal('sign-up-wrapper');
            
            nameInput.value = '';
            loginInput.value = '';
            passwordInput.value = '';
            confirmPasswordInput.value = '';
            
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            
            alert('Регистрация прошла успешно');
            
            // Обновляем таблицу пользователей
            if (typeof loadUsers === 'function') {
                loadUsers();
            } else if (window.loadUsers) {
                window.loadUsers();
            } else {
                console.log('Функция loadUsers не найдена, ищем альтернативы...');
                // Если loadUsers не доступна, пробуем найти другие способы
                setTimeout(() => {
                    // Можно вызвать событие для обновления
                    document.dispatchEvent(new CustomEvent('usersChanged'));
                }, 500);
            }
            
        } catch (error) {
            console.error('✗ Ошибка регистрации:', error);
            
            let errorMessage = 'Ошибка регистрации';
            
            if (error.message.includes('400')) {
                errorMessage = 'Неверные данные для регистрации';
            } else if (error.message.includes('409')) {
                errorMessage = 'Пользователь с таким логином уже существует';
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

function initializeSignUp() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(() => {
                initSignUpForm();
            }, 300);
        });
    } else {
        setTimeout(() => {
            initSignUpForm();
        }, 300);
    }
}

initializeSignUp();