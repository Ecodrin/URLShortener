let currentUser = null;
let userLinks = [];

const mainView = document.getElementById('main-view');
const cabinetView = document.getElementById('cabinet-view');
const authBtn = document.getElementById('auth-btn');
const userGreeting = document.getElementById('user-greeting');

const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
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
    loginError.textContent = '';
    registerError.textContent = '';
    if (cabinetMessage) cabinetMessage.textContent = '';
}

async function checkAuth() {
    try {
        const response = await fetch('/linksinfo', { credentials: 'include' });
        if (response.ok) {
            const links = await response.json();
            userLinks = links;
            currentUser = sessionStorage.getItem('currentUser') || 'Пользователь';
            updateCabinetView();
            updateUserGreeting();
        } else {
            sessionStorage.removeItem('currentUser');
            currentUser = null;
            userLinks = [];
            updateCabinetView();
            updateUserGreeting();
        }
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
    }
}
checkAuth();

function showMainView() {
    mainView.classList.add('active');
    cabinetView.classList.remove('active');
    authBtn.textContent = 'Вход / Регистрация';
    updateUserGreeting();
    clearErrors();
}

function showCabinetView() {
    mainView.classList.remove('active');
    cabinetView.classList.add('active');
    authBtn.textContent = 'На главную';
    updateCabinetView();
    updateUserGreeting();
    clearErrors();
}

authBtn.addEventListener('click', () => {
    if (mainView.classList.contains('active')) {
        showCabinetView();
    } else {
        showMainView();
    }
});

function updateUserGreeting() {
    if (mainView.classList.contains('active') && currentUser) {
        userGreeting.textContent = `Привет, ${currentUser}`;
        userGreeting.classList.remove('hidden');
    } else {
        userGreeting.classList.add('hidden');
    }
}

function updateCabinetView() {
    const authForms = document.getElementById('auth-forms');
    const linksList = document.getElementById('links-list');
    if (currentUser) {
        authForms.classList.add('hidden');
        linksList.classList.remove('hidden');
        renderLinks();
    } else {
        authForms.classList.remove('hidden');
        linksList.classList.add('hidden');
        document.getElementById('login-email').value = '';
        document.getElementById('login-password').value = '';
        document.getElementById('register-email').value = '';
        document.getElementById('register-password').value = '';
        clearErrors();
    }
}

async function loadLinks() {
    try {
        const response = await fetch('/linksinfo', { credentials: 'include' });
        if (response.ok) {
            userLinks = await response.json();
            renderLinks();
            if (cabinetMessage) cabinetMessage.textContent = '';
        } else if (response.status === 401) {
            sessionStorage.removeItem('currentUser');
            currentUser = null;
            userLinks = [];
            updateCabinetView();
            updateUserGreeting();
        } else {
            if (cabinetMessage) cabinetMessage.textContent = 'Ошибка загрузки ссылок';
        }
    } catch (error) {
        console.error('Ошибка загрузки ссылок:', error);
        if (cabinetMessage) cabinetMessage.textContent = 'Сетевая ошибка при загрузке ссылок';
    }
}


document.getElementById('login-btn').addEventListener('click', async () => {
    const login = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    const validation = validateLoginPassword(login, password);
    if (!validation.isValid) {
        loginError.textContent = validation.message;
        return;
    }

    try {
        const response = await fetch('/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ login, password })
        });
        if (response.ok) {
            currentUser = login;
            sessionStorage.setItem('currentUser', login);
            await loadLinks();
            showMainView();
            loginError.textContent = '';
        } else {
            const errMsg = await response.text();
            loginError.textContent = errMsg || 'Ошибка авторизации';
        }
    } catch (error) {
        console.error('Ошибка при авторизации:', error);
        loginError.textContent = 'Сетевая ошибка';
    }
});

document.getElementById('register-btn').addEventListener('click', async () => {
    const login = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    const validation = validateLoginPassword(login, password);
    if (!validation.isValid) {
        registerError.textContent = validation.message;
        return;
    }

    try {
        const response = await fetch('/registr', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ login, password })
        });
        if (response.ok) {
            currentUser = login;
            sessionStorage.setItem('currentUser', login);
            await loadLinks();
            showMainView();
            registerError.textContent = '';
        } else {
            const errMsg = await response.text();
            registerError.textContent = errMsg || 'Ошибка регистрации';
        }
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        registerError.textContent = 'Сетевая ошибка';
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('currentUser');
    currentUser = null;
    userLinks = [];
    updateCabinetView();
    showMainView();
});

function renderLinks() {
    const container = document.getElementById('links-container');
    if (userLinks.length === 0) {
        container.innerHTML = '<p class="empty-message">У вас пока нет сокращённых ссылок.</p>';
        return;
    }
    container.innerHTML = userLinks.map((link, index) => `
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
    if (target.classList.contains('delete-btn')) {
        e.preventDefault();
        const index = target.dataset.index;
        await deleteLink(index);
    } else if (target.classList.contains('stats-btn')) {
        e.preventDefault();
        const index = target.dataset.index;
        showStats(index);
    } else if (target.classList.contains('edit-btn')) {
        e.preventDefault();
        const index = target.dataset.index;
        enableInlineEdit(index);
    } else if (target.classList.contains('save-edit-btn')) {
        e.preventDefault();
        const index = target.dataset.index;
        await saveEdit(index);
    } else if (target.classList.contains('cancel-edit-btn')) {
        e.preventDefault();
        const index = target.dataset.index;
        cancelEdit(index);
    }
}

async function deleteLink(index) {
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

function enableInlineEdit(index) {
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

    const originalText = input.dataset.original || userLinks[index].src_link;
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

modalClose.addEventListener('click', () => {
    modal.classList.add('hidden');
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
    }
});

async function showStats(index) {
    const link = userLinks[index];
    try {
        const response = await fetch(`/linkinfo?link=${encodeURIComponent(link.dst_link)}`, {
            credentials: 'include'
        });
        if (!response.ok) {
            statsContainer.innerHTML = `<p class="error-message">Ошибка загрузки статистики: ${response.status}</p>`;
            modal.classList.remove('hidden');
            return;
        }
        const stats = await response.json();
        let html = '';
        if (stats.length > 0) {
            const columns = Object.keys(stats[0]);
            html += '<table><thead><tr>';
            columns.forEach(col => html += `<th>${col}</th>`);
            html += '</tr></thead><tbody>';
            stats.forEach(row => {
                html += '<tr>';
                columns.forEach(col => html += `<td>${row[col]}</td>`);
                html += '</tr>';
            });
            html += '</tbody></table>';
        } else {
            html = '<p>Пока нет переходов по этой ссылке.</p>';
        }
        statsContainer.innerHTML = html;
        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Ошибка получения статистики:', error);
        statsContainer.innerHTML = '<p class="error-message">Сетевая ошибка при загрузке статистики</p>';
        modal.classList.remove('hidden');
    }
}

function send_link() {
    fetch('/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'link': document.getElementById('long-url').value })
    })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => {
            document.getElementById('short-url').value = data['link'];
            qrcode_generation();

            if (currentUser) {
                loadLinks();
            }
        })
        .catch(error => console.error('Failed to send link: ', error));
}

function qrcode_generation() {
    const shortUrl = document.getElementById('short-url').value;
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
                document.getElementById('qr-image').src = reader.result;
            };
            reader.readAsDataURL(blob);
        })
        .catch(error => console.error('Failed to generate qr-code: ', error));
}

function copyPlainText() {
    const content = document.getElementById('short-url').value;
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

document.getElementById('generate-btn').addEventListener('click', send_link);
document.getElementById('copy-btn').addEventListener('click', copyPlainText);
document.getElementById('download-qr-btn').addEventListener('click', function() {
    const img = document.getElementById('qr-image');
    if (img.src && !img.src.endsWith('""') && img.src !== '') {
        downloadImage(img);
    } else {
        console.warn('QR code not generated yet');
    }
});