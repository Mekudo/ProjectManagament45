// ============================================
// ПЕРЕМЕННЫЕ
// ============================================

let customersList = [];
let customersCache = {};
let currentPage = 1;
let rowsPerPage = 10;
let filteredCustomers = [];
let dateFilter = 'all';
let sortFilter = 'name_asc';
let statusFilter = 'all';
let searchTerm = '';

// ============================================
// ЗАГРУЗКА ДАННЫХ
// ============================================

async function loadCustomersFull() {
    try {
        const response = await fetch('https://dmitrii-golubev.ru:7000/api/customer/all', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        
        if (!response.ok) throw new Error(`Ошибка ${response.status}`);
        const customersBasic = await response.json();
        
        const fullCustomers = await Promise.all(
            customersBasic.map(async (basic) => {
                const fullResponse = await fetch(`https://dmitrii-golubev.ru:7000/api/customer/${basic.id}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                return await fullResponse.json();
            })
        );
        
        customersList = fullCustomers;
        fullCustomers.forEach(c => customersCache[c.id] = c.name);
        
        // Применяем фильтры после загрузки
        applyFilters();
        updateStats();
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        const tbody = document.getElementById('customersTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="error-message">
                <i class="fas fa-exclamation-circle"></i> Ошибка загрузки: ${error.message}
            </td></tr>`;
        }
        showToast('Ошибка загрузки данных', 'error');
    }
}

// ============================================
// ФИЛЬТРАЦИЯ И СОРТИРОВКА
// ============================================

function applyFilters() {
    // Получаем значения из фильтров
    dateFilter = document.getElementById('dateFilter')?.value || 'all';
    sortFilter = document.getElementById('sortFilter')?.value || 'name_asc';
    statusFilter = document.getElementById('statusFilter')?.value || 'all';
    searchTerm = document.getElementById('customerSearch')?.value.toLowerCase() || '';
    
    // Фильтруем
    filteredCustomers = customersList.filter(c => {
        // Поиск по тексту
        if (searchTerm) {
            const matchesSearch = 
                (c.name && c.name.toLowerCase().includes(searchTerm)) ||
                (c.personName && c.personName.toLowerCase().includes(searchTerm)) ||
                (c.inn && c.inn.includes(searchTerm)) ||
                (c.phone && c.phone.includes(searchTerm)) ||
                (c.email && c.email.toLowerCase().includes(searchTerm));
            
            if (!matchesSearch) return false;
        }
        
        // Фильтр по статусу
        if (statusFilter === 'withPhone' && !c.phone) return false;
        if (statusFilter === 'withEmail' && !c.email) return false;
        if (statusFilter === 'withInn' && !c.inn) return false;
        if (statusFilter === 'withOgrn' && !c.ogrn) return false;
        
        // Фильтр по дате
        if (c.createdAt && dateFilter !== 'all') {
            const date = new Date(c.createdAt);
            const now = new Date();
            const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
            
            if (dateFilter === 'today' && diffDays > 0) return false;
            if (dateFilter === 'week' && diffDays > 7) return false;
            if (dateFilter === 'month' && diffDays > 30) return false;
            if (dateFilter === 'quarter' && diffDays > 90) return false;
            if (dateFilter === 'year' && diffDays > 365) return false;
        }
        
        return true;
    });
    
    // Сортируем
    filteredCustomers.sort((a, b) => {
        if (sortFilter === 'name_asc') return (a.name || '').localeCompare(b.name || '');
        if (sortFilter === 'name_desc') return (b.name || '').localeCompare(a.name || '');
        if (sortFilter === 'date_desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        if (sortFilter === 'date_asc') return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
        return 0;
    });
    
    // Сбрасываем на первую страницу
    currentPage = 1;
    
    // Обновляем отображение
    updateDisplay();
    updateFilterCounts();
}

function resetFilters() {
    document.getElementById('dateFilter').value = 'all';
    document.getElementById('sortFilter').value = 'name_asc';
    document.getElementById('statusFilter').value = 'all';
    document.getElementById('customerSearch').value = '';
    applyFilters();
    showToast('Фильтры сброшены', 'info');
}

// ============================================
// ОТОБРАЖЕНИЕ ТАБЛИЦЫ
// ============================================

function updateDisplay() {
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginatedCustomers = filteredCustomers.slice(start, end);
    
    displayCustomers(paginatedCustomers);
    updatePaginationInfo();
}

function displayCustomers(customers) {
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;

    if (!customers || customers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">Заказчики не найдены</td></tr>';
        return;
    }

    const userData = window.authUI?.getCurrentUser();
    const canDelete = userData?.roleNumber === 0 || userData?.role === 'Администратор';

    let html = '';
    customers.forEach((c, index) => {
        const rowNumber = (currentPage - 1) * rowsPerPage + index + 1;
        html += `
        <tr>
            <td>${rowNumber}</td>
            <td>${c.name || '—'}</td>
            <td>${c.personName || '—'}</td>
            <td>${c.inn || '—'}</td>
            <td>${c.ogrn || '—'}</td>
            <td>${c.phone || '—'}</td>
            <td>${c.email || '—'}</td>
            <td>
                <button class="btn-icon btn-edit" onclick="editCustomer('${c.id}')" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                ${canDelete ? `
                <button class="btn-icon btn-delete" onclick="openDeleteCustomerModal('${c.id}')" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>` : ''}
            </td>
        </tr>
        `;
    });
    tbody.innerHTML = html;
}

// ============================================
// ПАГИНАЦИЯ
// ============================================

function updatePaginationInfo() {
    const totalItems = filteredCustomers.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
    const start = (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, totalItems);
    
    document.getElementById('showingFrom').textContent = totalItems ? start : 0;
    document.getElementById('showingTo').textContent = totalItems ? end : 0;
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('currentPage').textContent = currentPage;
    document.getElementById('totalPages').textContent = totalPages;
    
    document.getElementById('prevPage').disabled = currentPage === 1;
    document.getElementById('nextPage').disabled = currentPage === totalPages || totalItems === 0;
    
    generatePageNumbers(totalPages);
}

function generatePageNumbers(totalPages) {
    const container = document.getElementById('pageNumbers');
    if (!container) return;
    
    let html = '';
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
        html += `<button class="page-number ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }
    
    container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    updateDisplay();
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        updateDisplay();
    }
}

function nextPage() {
    const totalPages = Math.ceil(filteredCustomers.length / rowsPerPage);
    if (currentPage < totalPages) {
        currentPage++;
        updateDisplay();
    }
}

function changeRowsPerPage(value) {
    rowsPerPage = parseInt(value);
    currentPage = 1;
    updateDisplay();
}

// ============================================
// СТАТИСТИКА
// ============================================

function updateStats() {
    document.getElementById('totalCustomers').textContent = customersList.length;
    
    const today = new Date().toDateString();
    document.getElementById('todayCustomers').textContent = customersList.filter(c => 
        c.createdAt && new Date(c.createdAt).toDateString() === today
    ).length;
    
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    document.getElementById('weekCustomers').textContent = customersList.filter(c => 
        c.createdAt && new Date(c.createdAt) > weekAgo
    ).length;
    
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    document.getElementById('monthCustomers').textContent = customersList.filter(c => 
        c.createdAt && new Date(c.createdAt) > monthAgo
    ).length;
}

function updateFilterCounts() {
    const counts = {
        all: customersList.length,
        withPhone: customersList.filter(c => c.phone).length,
        withEmail: customersList.filter(c => c.email).length,
        withInn: customersList.filter(c => c.inn).length,
        withOgrn: customersList.filter(c => c.ogrn).length,
        withoutContacts: customersList.filter(c => !c.phone && !c.email).length
    };
}

// ============================================
// ПОИСК
// ============================================

function searchCustomers() {
    applyFilters();
}

// ============================================
// ЭКСПОРТ
// ============================================

function exportCustomers() {
    if (!filteredCustomers.length) {
        showToast('Нет данных для экспорта', 'error');
        return;
    }
    
    const headers = ['№', 'Организация', 'ФИО', 'ИНН', 'ОГРН', 'Телефон', 'Email'];
    const csvRows = [];
    
    csvRows.push(headers.join(','));
    
    filteredCustomers.forEach((c, index) => {
        const row = [
            index + 1,
            `"${c.name || ''}"`,
            `"${c.personName || ''}"`,
            c.inn || '',
            c.ogrn || '',
            `"${c.phone || ''}"`,
            c.email || ''
        ];
        csvRows.push(row.join(','));
    });
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `заказчики_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Экспорт завершен', 'success');
}

// ============================================
// УВЕДОМЛЕНИЯ
// ============================================

window.showToast = function(message, type = 'success', title = '') {
    // Проверяем наличие контейнера
    let container = document.getElementById('toast-container');
    
    // Если контейнера нет - создаем
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️'
    };
    
    const titles = {
        success: 'Успех!',
        error: 'Ошибка!',
        info: 'Информация'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || '📢'}</div>
        <div class="toast-content">
            <div class="toast-title">${title || titles[type] || 'Уведомление'}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Автоматически скрыть через 5 секунд
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
};

// ============================================
// МОДАЛКИ
// ============================================

// Открыть модалку удаления
window.openDeleteCustomerModal = function(customerId) {
    document.getElementById('delete-customer-id').value = customerId;
    openModal('delete-customer-wrapper');
};

// Открыть модалку создания
window.openAddCustomerModal = () => openModal('customer-wrapper');

// ============================================
// СОЗДАНИЕ ЗАКАЗЧИКА
// ============================================

window.addCustomerFromModal = function() {
    const errors = validateCustomerForm();
    
    if (errors.length > 0) {
        showToast(errors[0], 'error', 'Ошибка валидации');
        highlightInvalidFields();
        return;
    }
    
    const customerData = {
        name: document.getElementById('orgInput')?.value.trim(),
        personName: document.getElementById('fioInput')?.value.trim(),
        inn: document.getElementById('innInput')?.value.trim(),
        ogrn: document.getElementById('ogrnInput')?.value.trim(),
        phone: document.getElementById('phoneNumberInput')?.value.trim(),
        email: document.getElementById('emailInput')?.value.trim()
    };
    
    const submitBtn = document.querySelector('#customer-wrapper .btn-primary');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создание...';
    submitBtn.disabled = true;
    
    fetch('https://dmitrii-golubev.ru:7000/api/customer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(customerData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { 
                throw new Error(err.message || 'Ошибка создания'); 
            });
        }
        return response.json();
    })
    .then(result => {
        showToast('Заказчик успешно создан', 'success', 'Создание');
        closeModal('customer-wrapper');
        loadCustomersFull();
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showToast('Ошибка при создании: ' + error.message, 'error');
    })
    .finally(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
};

// ============================================
// РЕДАКТИРОВАНИЕ
// ============================================

window.editCustomer = async function(customerId) {
    try {
        const response = await fetch(`https://dmitrii-golubev.ru:7000/api/customer/${customerId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки данных');
        }
        
        const customer = await response.json();
        
        document.getElementById('edit-customer-id').value = customer.id;
        document.getElementById('edit-customer').value = customer.name || '';
        document.getElementById('edit-fio-customer').value = customer.personName || '';
        document.getElementById('edit-inn').value = customer.inn || '';
        document.getElementById('edit-ogrn').value = customer.ogrn || '';
        document.getElementById('edit-phone-number').value = customer.phone || '';
        document.getElementById('edit-email').value = customer.email || '';

        openModal('edit-customer-wrapper');
    } catch (error) {
        console.error('Ошибка:', error);
        showToast('Ошибка загрузки: ' + error.message, 'error');
    }
};

window.updateCustomerFromModal = function() {
    const errors = validateEditCustomerForm();
    
    if (errors.length > 0) {
        showToast(errors[0], 'error', 'Ошибка валидации');
        highlightEditInvalidFields();
        return;
    }
    
    const customerData = {
        id: document.getElementById('edit-customer-id').value,
        name: document.getElementById('edit-customer').value.trim(),
        personName: document.getElementById('edit-fio-customer').value.trim(),
        inn: document.getElementById('edit-inn').value.trim(),
        ogrn: document.getElementById('edit-ogrn').value.trim(),
        phone: document.getElementById('edit-phone-number').value.trim(),
        email: document.getElementById('edit-email').value.trim()
    };

    const submitBtn = document.querySelector('#edit-customer-wrapper .btn-primary');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Сохранение...';
    submitBtn.disabled = true;

    fetch('https://dmitrii-golubev.ru:7000/api/customer', {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(customerData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { 
                throw new Error(err.message || 'Ошибка обновления'); 
            });
        }
        return response.json();
    })
    .then(() => {
        showToast('Заказчик успешно обновлен', 'success', 'Обновление');
        closeModal('edit-customer-wrapper');
        loadCustomersFull();
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showToast('Ошибка при обновлении: ' + error.message, 'error');
    })
    .finally(() => {
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    });
};

window.updateCustomer = function(event) {
    event.preventDefault();
    updateCustomerFromModal();
};

// ============================================
// УДАЛЕНИЕ
// ============================================

window.deleteCustomer = function(customerId) {
    fetch(`https://dmitrii-golubev.ru:7000/api/customer/${customerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { 
                throw new Error(err.message || 'Ошибка удаления'); 
            });
        }
        showToast('Заказчик успешно удален', 'success', 'Удаление');
        closeModal('delete-customer-wrapper');
        loadCustomersFull();
    })
    .catch(error => {
        console.error('Ошибка:', error);
        showToast('Ошибка при удалении: ' + error.message, 'error');
    });
};

// ============================================
// ВАЛИДАЦИЯ
// ============================================

function validateCustomerForm() {
    const errors = [];
    
    const orgName = document.getElementById('orgInput')?.value.trim();
    const fio = document.getElementById('fioInput')?.value.trim();
    const inn = document.getElementById('innInput')?.value.trim();
    const ogrn = document.getElementById('ogrnInput')?.value.trim();
    const phone = document.getElementById('phoneNumberInput')?.value.trim();
    const email = document.getElementById('emailInput')?.value.trim();

    // Обязательные поля
    if (!orgName) {
        errors.push('Введите наименование организации');
    } else if (orgName.length < 2) {
        errors.push('Наименование организации должно содержать минимум 2 символа');
    }

    if (!fio) {
        errors.push('Введите ФИО ответственного лица');
    } else if (fio.length < 5) {
        errors.push('ФИО должно содержать минимум 5 символов');
    } else if (!/^[а-яА-ЯёЁ\s\-]+$/.test(fio)) {
        errors.push('ФИО может содержать только буквы, пробелы и дефисы');
    }

    if (!phone) {
        errors.push('Введите номер телефона');
    } else {
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 10 || phoneDigits.length > 11) {
            errors.push('Телефон должен содержать 10-11 цифр');
        }
    }

    if (!email) {
        errors.push('Введите email');
    } else {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            errors.push('Введите корректный email');
        }
    }

    // Необязательные поля
    if (inn && (!/^\d+$/.test(inn) || (inn.length !== 10 && inn.length !== 12))) {
        errors.push('ИНН должен содержать 10 или 12 цифр');
    }

    if (ogrn && (!/^\d+$/.test(ogrn) || (ogrn.length !== 13 && ogrn.length !== 15))) {
        errors.push('ОГРН должен содержать 13 или 15 цифр');
    }

    return errors;
}

function validateEditCustomerForm() {
    const errors = [];
    
    const orgName = document.getElementById('edit-customer')?.value.trim();
    const fio = document.getElementById('edit-fio-customer')?.value.trim();
    const inn = document.getElementById('edit-inn')?.value.trim();
    const ogrn = document.getElementById('edit-ogrn')?.value.trim();
    const phone = document.getElementById('edit-phone-number')?.value.trim();
    const email = document.getElementById('edit-email')?.value.trim();

    // Обязательные поля
    if (!orgName) {
        errors.push('Введите наименование организации');
    } else if (orgName.length < 2) {
        errors.push('Наименование организации должно содержать минимум 2 символа');
    }

    if (!fio) {
        errors.push('Введите ФИО ответственного лица');
    } else if (fio.length < 5) {
        errors.push('ФИО должно содержать минимум 5 символов');
    } else if (!/^[а-яА-ЯёЁ\s\-]+$/.test(fio)) {
        errors.push('ФИО может содержать только буквы, пробелы и дефисы');
    }

    if (!phone) {
        errors.push('Введите номер телефона');
    } else {
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length < 10 || phoneDigits.length > 11) {
            errors.push('Телефон должен содержать 10-11 цифр');
        }
    }

    if (!email) {
        errors.push('Введите email');
    } else {
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            errors.push('Введите корректный email');
        }
    }

    // Необязательные поля
    if (inn && (!/^\d+$/.test(inn) || (inn.length !== 10 && inn.length !== 12))) {
        errors.push('ИНН должен содержать 10 или 12 цифр');
    }

    if (ogrn && (!/^\d+$/.test(ogrn) || (ogrn.length !== 13 && ogrn.length !== 15))) {
        errors.push('ОГРН должен содержать 13 или 15 цифр');
    }

    return errors;
}

function highlightInvalidFields() {
    document.querySelectorAll('.form-input').forEach(input => {
        input.style.borderColor = '#e2e8f0';
    });
    
    const orgName = document.getElementById('orgInput')?.value.trim();
    const fio = document.getElementById('fioInput')?.value.trim();
    const inn = document.getElementById('innInput')?.value.trim();
    const ogrn = document.getElementById('ogrnInput')?.value.trim();
    const phone = document.getElementById('phoneNumberInput')?.value.trim();
    const email = document.getElementById('emailInput')?.value.trim();
    
    if (!orgName || orgName.length < 2) {
        document.getElementById('orgInput').style.borderColor = '#ef4444';
    }
    
    if (!fio || fio.length < 5 || !/^[а-яА-ЯёЁ\s\-]+$/.test(fio)) {
        document.getElementById('fioInput').style.borderColor = '#ef4444';
    }
    
    if (!phone || phone.replace(/\D/g, '').length < 10) {
        document.getElementById('phoneNumberInput').style.borderColor = '#ef4444';
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email)) {
        document.getElementById('emailInput').style.borderColor = '#ef4444';
    }
    
    if (inn && (!/^\d+$/.test(inn) || (inn.length !== 10 && inn.length !== 12))) {
        document.getElementById('innInput').style.borderColor = '#ef4444';
    }
    
    if (ogrn && (!/^\d+$/.test(ogrn) || (ogrn.length !== 13 && ogrn.length !== 15))) {
        document.getElementById('ogrnInput').style.borderColor = '#ef4444';
    }
}

function highlightEditInvalidFields() {
    document.querySelectorAll('#edit-customer-wrapper .edit-info-input').forEach(input => {
        input.style.borderColor = '#e2e8f0';
    });
    
    const orgName = document.getElementById('edit-customer')?.value.trim();
    const fio = document.getElementById('edit-fio-customer')?.value.trim();
    const inn = document.getElementById('edit-inn')?.value.trim();
    const ogrn = document.getElementById('edit-ogrn')?.value.trim();
    const phone = document.getElementById('edit-phone-number')?.value.trim();
    const email = document.getElementById('edit-email')?.value.trim();
    
    if (!orgName || orgName.length < 2) {
        document.getElementById('edit-customer').style.borderColor = '#ef4444';
    }
    
    if (!fio || fio.length < 5 || !/^[а-яА-ЯёЁ\s\-]+$/.test(fio)) {
        document.getElementById('edit-fio-customer').style.borderColor = '#ef4444';
    }
    
    if (!phone || phone.replace(/\D/g, '').length < 10) {
        document.getElementById('edit-phone-number').style.borderColor = '#ef4444';
    }
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!email || !emailRegex.test(email)) {
        document.getElementById('edit-email').style.borderColor = '#ef4444';
    }
    
    if (inn && (!/^\d+$/.test(inn) || (inn.length !== 10 && inn.length !== 12))) {
        document.getElementById('edit-inn').style.borderColor = '#ef4444';
    }
    
    if (ogrn && (!/^\d+$/.test(ogrn) || (ogrn.length !== 13 && ogrn.length !== 15))) {
        document.getElementById('edit-ogrn').style.borderColor = '#ef4444';
    }
}

// ============================================
// МАСКА ДЛЯ ТЕЛЕФОНА
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    const phoneInput = document.getElementById('phoneNumberInput');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let x = e.target.value.replace(/\D/g, '').match(/(\d{0,1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})/);
            e.target.value = !x[2] ? x[1] : '+7 (' + x[2] + ') ' + x[3] + (x[4] ? '-' + x[4] : '') + (x[5] ? '-' + x[5] : '');
        });
    }
});

// ============================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('customersTableBody')) {
        loadCustomersFull();
        
        const searchInput = document.getElementById('customerSearch');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', function() {
                clearTimeout(timeout);
                timeout = setTimeout(searchCustomers, 300);
            });
        }
        
        const rowsSelect = document.getElementById('rowsPerPage');
        if (rowsSelect) {
            rowsSelect.addEventListener('change', function(e) {
                changeRowsPerPage(e.target.value);
            });
        }
    }

    document.getElementById('edit-customer-form')?.addEventListener('submit', updateCustomer);
});

document.addEventListener('customersPageLoaded', () => loadCustomersFull());

document.addEventListener('click', (e) => {
    if (e.target.closest('[data-page="customers"]')) {
        setTimeout(loadCustomersFull, 300);
    }
});

// ============================================
// ГЛОБАЛЬНЫЕ ФУНКЦИИ
// ============================================

window.loadCustomersFull = loadCustomersFull;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.searchCustomers = searchCustomers;
window.exportCustomers = exportCustomers;
window.changeRowsPerPage = changeRowsPerPage;
window.goToPage = goToPage;
window.prevPage = prevPage;
window.nextPage = nextPage;
window.updateStats = updateStats;
window.openAddCustomerModal = openAddCustomerModal;
window.openDeleteCustomerModal = openDeleteCustomerModal;
window.addCustomerFromModal = addCustomerFromModal;
window.editCustomer = editCustomer;
window.updateCustomerFromModal = updateCustomerFromModal;
window.updateCustomer = updateCustomer;
window.deleteCustomer = deleteCustomer;
window.showToast = showToast;