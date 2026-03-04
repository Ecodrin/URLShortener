let currentUser = null;
let userLinks = [];

const mainView = document.getElementById('main-view');
const cabinetView = document.getElementById('cabinet-view');
const authBtn = document.getElementById('auth-btn');


const authLogin = document.getElementById('auth-login');
const authPassword = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');
const cabinetMessage = document.getElementById('cabinet-message');

function validateLoginPassword(login, password) {
    if (login.length > 50) {
        return { isValid: false, message: 'Логин должен содержать не более 50 символов' };
    }
    if (password.length > 50) {
        return { isValid: false, message: 'Пароль должен содержать не более 50 символов' };
    }

    const loginRegex = /^[a-zA-Z0-9]+$/;
    if (!loginRegex.test(login)) {
        return { isValid: false, message: 'Логин может содержать только буквы и цифры' };
    }

    const passwordRegex = /^[a-zA-Z0-9_\-!]+$/;
    if (!passwordRegex.test(password)) {
        return { isValid: false, message: 'Пароль может содержать буквы, цифры и символы _ - !' };
    }

    return { isValid: true, message: '' };
}

function clearErrors() {
    if (authError) authError.textContent = '';
    if (cabinetMessage) cabinetMessage.textContent = '';
}

function updateAuthButton() {
    if (authBtn) {
        authBtn.textContent = currentUser ? currentUser : 'Вход / Регистрация';
    }
}

async function checkAuth() {
    console.log('Проверка авторизации...');
    try {
        const response = await fetch('/linksinfo', { credentials: 'include' });
        console.log('Ответ /linksinfo:', response.status);
        if (response.ok) {
            const links = await response.json();
            userLinks = Array.isArray(links) ? links : [];
            currentUser = sessionStorage.getItem('currentUser') || 'Пользователь';
            console.log('Пользователь авторизован:', currentUser);
            updateAuthButton();
            updateCabinetView();
        } else {
            console.log('Пользователь не авторизован');
            sessionStorage.removeItem('currentUser');
            currentUser = null;
            userLinks = [];
            updateAuthButton();
            updateCabinetView();
        }
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        userLinks = [];
    }
}
checkAuth();

function showMainView() {
    console.log('Переключение на главную');
    mainView.classList.add('active');
    cabinetView.classList.remove('active');
    updateAuthButton();
    clearErrors();
}

function showCabinetView() {
    console.log('Переключение на личный кабинет');
    mainView.classList.remove('active');
    cabinetView.classList.add('active');
    updateAuthButton();
    clearErrors();
}

authBtn.addEventListener('click', () => {
    if (mainView.classList.contains('active')) {
        showCabinetView();
    } else {
        showMainView();
    }
});

function updateCabinetView() {
    console.log('updateCabinetView, currentUser =', currentUser);
    const authForms = document.getElementById('auth-forms');
    const linksList = document.getElementById('links-list');
    if (currentUser) {
        console.log('Показываем список ссылок');
        if (authForms) authForms.classList.add('hidden');
        if (linksList) linksList.classList.remove('hidden');
        renderLinks();
    } else {
        console.log('Показываем форму входа');
        if (authForms) authForms.classList.remove('hidden');
        if (linksList) linksList.classList.add('hidden');
        if (authLogin) authLogin.value = '';
        if (authPassword) authPassword.value = '';
        if (authError) authError.textContent = '';
    }
}

async function loadLinks() {
    console.log('Загрузка ссылок...');
    try {
        const response = await fetch('/linksinfo', { credentials: 'include' });
        console.log('Ответ /linksinfo в loadLinks:', response.status);
        if (response.ok) {
            const links = await response.json();
            userLinks = Array.isArray(links) ? links : [];
            renderLinks();
            if (cabinetMessage) cabinetMessage.textContent = '';
        } else if (response.status === 401) {
            console.log('Сессия истекла, сбрасываем пользователя');
            sessionStorage.removeItem('currentUser');
            currentUser = null;
            userLinks = [];
            updateAuthButton();
            updateCabinetView();
        } else {
            if (cabinetMessage) cabinetMessage.textContent = 'Ошибка загрузки ссылок';
            if (!Array.isArray(userLinks)) userLinks = [];
        }
    } catch (error) {
        console.error('Ошибка загрузки ссылок:', error);
        if (cabinetMessage) cabinetMessage.textContent = 'Сетевая ошибка при загрузке ссылок';
        if (!Array.isArray(userLinks)) userLinks = [];
    }
}


document.getElementById('login-btn')?.addEventListener('click', async () => {
    console.log('Клик по кнопке Войти');
    if (!authLogin || !authPassword) {
        console.error('Поля не найдены');
        return;
    }
    const login = authLogin.value.trim();
    const password = authPassword.value;

    const validation = validateLoginPassword(login, password);
    if (!validation.isValid) {
        if (authError) authError.textContent = validation.message;
        return;
    }

    try {
        const response = await fetch('/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ login, password })
        });
        console.log('Ответ /auth:', response.status);
        if (response.ok) {
            currentUser = login;
            sessionStorage.setItem('currentUser', login);
            updateAuthButton();
            updateCabinetView();
            showCabinetView();
            await loadLinks();
            if (authError) authError.textContent = '';
            if (authLogin) authLogin.value = '';
            if (authPassword) authPassword.value = '';
        } else {
            const errMsg = await response.text();
            if (authError) authError.textContent = errMsg || 'Ошибка авторизации';
        }
    } catch (error) {
        console.error('Ошибка при авторизации:', error);
        if (authError) authError.textContent = 'Сетевая ошибка';
    }
});
document.getElementById('register-btn')?.addEventListener('click', async () => {
    console.log('Клик по кнопке Зарегистрироваться');
    if (!authLogin || !authPassword) {
        console.error('Поля не найдены');
        return;
    }
    const login = authLogin.value.trim();
    const password = authPassword.value;

    const validation = validateLoginPassword(login, password);
    if (!validation.isValid) {
        if (authError) authError.textContent = validation.message;
        return;
    }

    try {
        const response = await fetch('/registr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ login, password })
        });
        console.log('Ответ /registr:', response.status);
        if (response.ok) {
            currentUser = login;
            sessionStorage.setItem('currentUser', login);
            updateAuthButton();
            updateCabinetView();
            showCabinetView();
            await loadLinks();
            if (authError) authError.textContent = '';
            if (authLogin) authLogin.value = '';
            if (authPassword) authPassword.value = '';
        } else {
            const errMsg = await response.text();
            if (authError) authError.textContent = errMsg || 'Ошибка регистрации';
        }
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        if (authError) authError.textContent = 'Сетевая ошибка';
    }
});

document.getElementById('logout-btn')?.addEventListener('click', async () => {
    console.log('Выход из аккаунта');
    const modal = document.getElementById('stats-modal');
    if (modal) modal.classList.add('hidden');

    try {
        await fetch('/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
        console.error('Ошибка при выходе:', e);
    } finally {
        sessionStorage.removeItem('currentUser');
        currentUser = null;
        userLinks = [];
        updateAuthButton();
        updateCabinetView();
        showMainView();
    }
});

function renderLinks() {
    const container = document.getElementById('links-container');
    if (!container) return;
    const links = Array.isArray(userLinks) ? userLinks : [];
    if (links.length === 0) {
        container.innerHTML = '<p class="empty-message">У вас пока нет сокращённых ссылок.</p>';
        return;
    }
    container.innerHTML = links.map((link, index) => `
    <div class="link-item" data-index="${index}">
      <div class="link-info">
        <a href="${link.dst_link}" target="_blank" class="short-link">${link.dst_link}</a>
        <div class="long-link" title="${link.src_link}">${link.src_link}</div>
      </div>
      <div class="link-actions">
        <button class="stats-btn" data-index="${index}">Статистика</button>
        <button class="edit-btn" data-index="${index}">Редактировать</button>
        <button class="delete-btn" data-index="${index}">Удалить</button>
      </div>
    </div>
  `).join('');

    container.addEventListener('click', handleLinkActions);
}


async function handleLinkActions(e) {
    const target = e.target;
    const index = target.dataset.index;
    if (index === undefined) return;

    if (target.classList.contains('delete-btn')) {
        e.preventDefault();
        await deleteLink(parseInt(index));
    } else if (target.classList.contains('stats-btn')) {
        e.preventDefault();
        showStats(parseInt(index));
    } else if (target.classList.contains('edit-btn')) {
        e.preventDefault();
        enableInlineEdit(parseInt(index));
    } else if (target.classList.contains('save-edit-btn')) {
        e.preventDefault();
        await saveEdit(parseInt(index));
    } else if (target.classList.contains('cancel-edit-btn')) {
        e.preventDefault();
        cancelEdit(parseInt(index));
    }
}

async function deleteLink(index) {
    if (!Array.isArray(userLinks) || !userLinks[index]) {
        console.warn('Ссылка с индексом', index, 'не найдена. Обновляем список...');
        await loadLinks();
        return;
    }

    const link = userLinks[index];
    try {
        const response = await fetch('/deletelink', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ link: link.dst_link })
        });
        if (response.ok) {
            await loadLinks();
        } else {
            const errMsg = await response.text();
            if (cabinetMessage) cabinetMessage.textContent = errMsg || 'Ошибка при удалении';
        }
    } catch (error) {
        console.error('Ошибка удаления:', error);
        if (cabinetMessage) cabinetMessage.textContent = 'Сетевая ошибка при удалении';
    }
}

async function showStats(index) {
    if (!Array.isArray(userLinks) || !userLinks[index]) {
        await loadLinks();
        return;
    }

    const link = userLinks[index];
    try {
        const response = await fetch('/linkinfo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ link: link.dst_link })
        });

        if (!response.ok) {
            if (statsContainer) statsContainer.innerHTML = `<p class="error-message">Ошибка загрузки статистики: ${response.status}</p>`;
            if (modal) modal.classList.remove('hidden');
            return;
        }

        const stats = await response.json();

        let html = '';
        if (stats && stats.length > 0) {
            html = '<table><thead><tr>';
            html += '<th>Браузер</th><th>Время перехода</th><th>ID ссылки</th>';
            html += '</tr></thead><tbody>';

            stats.forEach(row => {
                html += '<tr>';
                html += `<td>${row.browser || ''}</td>`;
                html += `<td>${row.timestamp || ''}</td>`;
                html += `<td>${row.link_id || ''}</td>`;
                html += '</tr>';
            });
            html += '</tbody></table>';
        } else {
            html = '<p>Пока нет переходов по этой ссылке.</p>';
        }

        if (statsContainer) statsContainer.innerHTML = html;
        if (modal) modal.classList.remove('hidden');
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        if (statsContainer) statsContainer.innerHTML = '<p class="error-message">Сетевая ошибка при загрузке статистики</p>';
        if (modal) modal.classList.remove('hidden');
    }
}

function enableInlineEdit(index) {
    if (!Array.isArray(userLinks) || !userLinks[index]) {
        loadLinks();
        return;
    }

    const linkItem = document.querySelector(`.link-item[data-index="${index}"]`);
    if (!linkItem) return;
    if (linkItem.querySelector('.edit-input')) return;

    const longLinkDiv = linkItem.querySelector('.long-link');
    const currentSrc = longLinkDiv.textContent;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentSrc;
    input.className = 'url-input edit-input';
    input.setAttribute('data-original', currentSrc);
    longLinkDiv.replaceWith(input);

    const actionsDiv = linkItem.querySelector('.link-actions');
    const oldButtonsHtml = actionsDiv.innerHTML;
    actionsDiv.setAttribute('data-old-buttons', oldButtonsHtml);
    actionsDiv.innerHTML = `
    <button class="save-edit-btn btn" data-index="${index}">Сохранить</button>
    <button class="cancel-edit-btn btn" data-index="${index}">Отмена</button>
  `;
}

async function saveEdit(index) {
    if (!Array.isArray(userLinks) || !userLinks[index]) {
        await loadLinks();
        return;
    }
    const linkItem = document.querySelector(`.link-item[data-index="${index}"]`);
    if (!linkItem) return;

    const input = linkItem.querySelector('.edit-input');
    if (!input) return;

    const newSrc = input.value.trim();
    if (!newSrc) {
        if (cabinetMessage) cabinetMessage.textContent = 'Ссылка не может быть пустой';
        return;
    }

    const link = userLinks[index];
    try {
        const response = await fetch('/updatesrclink', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                old_link: link.src_link,
                new_link: newSrc,
                dst_link: link.dst_link
            })
        });
        if (response.ok) {
            await loadLinks();
        } else {
            const errMsg = await response.text();
            if (cabinetMessage) cabinetMessage.textContent = errMsg || 'Ошибка при обновлении';
            cancelEdit(index);
        }
    } catch (error) {
        console.error('Ошибка редактирования:', error);
        if (cabinetMessage) cabinetMessage.textContent = 'Сетевая ошибка';
        cancelEdit(index);
    }
}

function cancelEdit(index) {
    const linkItem = document.querySelector(`.link-item[data-index="${index}"]`);
    if (!linkItem) return;

    const input = linkItem.querySelector('.edit-input');
    if (!input) return;

    const originalText = input.dataset.original || (Array.isArray(userLinks) && userLinks[index] ? userLinks[index].src_link : '');
    const newDiv = document.createElement('div');
    newDiv.className = 'long-link';
    newDiv.textContent = originalText;
    newDiv.setAttribute('title', originalText);
    input.replaceWith(newDiv);

    const actionsDiv = linkItem.querySelector('.link-actions');
    const oldButtonsHtml = actionsDiv.dataset.oldButtons;
    if (oldButtonsHtml) {
        actionsDiv.innerHTML = oldButtonsHtml;
        actionsDiv.removeAttribute('data-old-buttons');
    }
}


const modal = document.getElementById('stats-modal');
const modalClose = document.querySelector('.close-btn');
const statsContainer = document.getElementById('stats-table-container');

if (modalClose) {
    modalClose.addEventListener('click', () => {
        modal.classList.add('hidden');
    });
}

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
    }
});


function send_link() {
    fetch('/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'link': document.getElementById('long-url')?.value })
    })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            const shortUrlField = document.getElementById('short-url');
            if (shortUrlField) shortUrlField.value = data['link'];
            qrcode_generation();
            if (currentUser) {
                loadLinks();
            }
        })
        .catch(error => console.error('Failed to send link: ', error));
}

function qrcode_generation() {
    const shortUrl = document.getElementById('short-url')?.value;
    if (!shortUrl) {
        console.error('No short url found.');
        return;
    }
    fetch('/generateqrcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'link': shortUrl })
    })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.blob();
        })
        .then(blob => {
            const reader = new FileReader();
            reader.onloadend = function () {
                const qrImage = document.getElementById('qr-image');
                if (qrImage) qrImage.src = reader.result;
            };
            reader.readAsDataURL(blob);
        })
        .catch(error => console.error('Failed to generate qr-code: ', error));
}

function copyPlainText() {
    const content = document.getElementById('short-url')?.value;
    if (!content) return;
    try {
        navigator.clipboard.writeText(content);
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
}

function downloadImage(imgElement) {
    if (!imgElement.complete) {
        console.warn('Image not loaded yet');
        return;
    }
    const imageUrl = imgElement.src;
    const fileName = 'qrcode.png';
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.getElementById('generate-btn')?.addEventListener('click', send_link);
document.getElementById('copy-btn')?.addEventListener('click', copyPlainText);
document.getElementById('download-qr-btn')?.addEventListener('click', function() {
    const img = document.getElementById('qr-image');
    if (img && img.src && !img.src.endsWith('""') && img.src !== '') {
        downloadImage(img);
    } else {
        console.warn('QR code not generated yet');
    }
});


function setupPasswordToggle(toggleButton) {
    toggleButton.addEventListener('click', function() {
        const wrapper = this.closest('.password-wrapper');
        if (!wrapper) return;
        const passwordInput = wrapper.querySelector('.url-input');
        if (!passwordInput) return;
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);

        const eyeOpen = this.querySelector('.eye-icon:not(.eye-slash)');
        const eyeSlash = this.querySelector('.eye-slash');
        if (eyeOpen && eyeSlash) {
            if (type === 'password') {
                eyeOpen.style.display = '';
                eyeSlash.style.display = 'none';
            } else {
                eyeOpen.style.display = 'none';
                eyeSlash.style.display = '';
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    const toggleButtons = document.querySelectorAll('.password-toggle');
    toggleButtons.forEach(btn => setupPasswordToggle(btn));
});