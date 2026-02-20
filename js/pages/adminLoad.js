function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    
    tbody.innerHTML = `
        <tr class="loading-row">
            <td colspan="4" class="loading-cell">
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>Загрузка пользователей...</span>
                </div>
            </td>
        </tr>
    `;
    
    fetch('https://dmitrii-golubev.ru:7000/api/user/all', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
    })
    .then(users => {
        console.log('Все пользователи с сервера (включая неактивных):', users);
        
        const activeUsers = users.filter(user => user.isActive === true);
        
        console.log('Активные пользователи (isActive: true):', activeUsers);
        console.log(`Всего: ${users.length}, Активных: ${activeUsers.length}, Неактивных: ${users.length - activeUsers.length}`);
        
        tbody.innerHTML = '';
        
        if (!activeUsers || activeUsers.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; padding: 40px; color: #7f8c8d;">
                        <i class="fas fa-users" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                        Нет активных пользователей
                        <br>
                        <small>В системе есть ${users.length - activeUsers.length} неактивных пользователей</small>
                    </td>
                </tr>
            `;
            return;
        }
        
        activeUsers.forEach(user => {
            const row = document.createElement('tr');
            const roleInfo = getRoleInfo(user.role);
            
            row.innerHTML = `
                <td>${user.login || ''}</td>
                <td>${user.name || ''}</td>
                <td>
                    <span class="status-badge ${roleInfo.className}">
                        ${roleInfo.text}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" onclick="editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
                        
            tbody.appendChild(row);
        });
        
        console.log('✅ Отображено активных пользователей:', activeUsers.length);
    })
    .catch(error => {
        console.error('Ошибка загрузки пользователей:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px; color: #e74c3c;">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    Ошибка загрузки пользователей
                    <br>
                    <small>${error.message}</small>
                </td>
            </tr>
        `;
    });
}

function getRoleInfo(roleNumber) {
    switch (Number(roleNumber)) {
        case 0: return { text: 'Администратор', className: 'role-admin' };
        case 1: return { text: 'Руководитель проекта', className: 'role-manager' };
        case 2: return { text: 'Исполнитель', className: 'role-executor' };
        default: return { text: 'Пользователь', className: 'role-user' };
    }
}

function editUser(userId) {
    console.log('Редактирование пользователя с ID:', userId);
    
    const modalWrapper = document.getElementById('edit-user-wrapper');
    
    if (!modalWrapper) {
        alert('Ошибка: форма редактирования не загружена');
        return;
    }
    
    fetch(`https://dmitrii-golubev.ru:7000/api/user/${userId}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    })
    .then(response => {
        if (!response.ok) throw new Error(`Ошибка загрузки: ${response.status}`);
        return response.json();
    })
    .then(user => {
        console.log('Данные пользователя:', user);
        
        document.getElementById('edit-user-id').value = user.id || '';
        document.getElementById('edit-user-name').value = user.name || '';
        document.getElementById('edit-user-login').value = user.login || '';
        document.getElementById('edit-user-role').value = user.role !== undefined ? user.role : 2;
        document.getElementById('edit-user-password').value = '';
        document.getElementById('edit-user-password-confirm').value = '';
        
        if (typeof openModal === 'function') {
            openModal('edit-user-wrapper');
        } else {
            modalWrapper.style.display = 'flex';
            modalWrapper.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    })
    .catch(error => {
        console.error('Ошибка загрузки пользователя:', error);
        alert('Не удалось загрузить данные пользователя. Возможно, пользователь был удален.');
    });
}

function saveUserChanges(event) {
    event.preventDefault();
    
    const userId = document.getElementById('edit-user-id').value;
    const name = document.getElementById('edit-user-name').value.trim();
    const login = document.getElementById('edit-user-login').value.trim();
    const role = parseInt(document.getElementById('edit-user-role').value);
    const password = document.getElementById('edit-user-password').value;
    const passwordConfirm = document.getElementById('edit-user-password-confirm').value;
    
    if (!name || !login) {
        alert('Имя и логин обязательны');
        return;
    }
    
    if (password || passwordConfirm) {
        if (password.length < 8) {
            alert('Пароль должен содержать минимум 8 символов');
            return;
        }
        if (password !== passwordConfirm) {
            alert('Пароли не совпадают');
            return;
        }
    }
    
    const userData = {
        id: userId,
        login: login,
        name: name,
        role: role,
        password: password
    };
    
    console.log('Отправка данных:', userData);
    
    fetch(`https://dmitrii-golubev.ru:7000/api/user`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(userData)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text);
            });
        }
        return response.json().catch(() => ({}));
    })
    .then(() => {
        if (typeof closeModal === 'function') {
            closeModal('edit-user-wrapper');
        } else {
            document.getElementById('edit-user-wrapper').style.display = 'none';
        }
        loadUsers();
        alert('Пользователь успешно обновлен');
    })
    .catch(error => {
        console.error('Ошибка:', error);
        alert('Ошибка: ' + error.message);
    });
}

function deleteUser(userId) {
    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        fetch(`https://dmitrii-golubev.ru:7000/api/user/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
        .then(response => {
            if (!response.ok) throw new Error(`Ошибка удаления: ${response.status}`);
            loadUsers();
            alert('Пользователь успешно удален');
        })
        .catch(error => {
            console.error('Ошибка:', error);
            alert('Не удалось удалить пользователя');
        });
    }
}

window.loadUsers = loadUsers;
window.editUser = editUser;
window.saveUserChanges = saveUserChanges;
window.deleteUser = deleteUser;