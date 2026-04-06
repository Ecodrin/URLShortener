
let currentUser = null;
let userLinks = [];

const mainView = document.getElementById('main-view');
const cabinetView = document.getElementById('cabinet-view');
const authBtn = document.getElementById('auth-btn');

const authLogin = document.getElementById('auth-login');
const authPassword = document.getElementById('auth-password');
const authError = document.getElementById('auth-error');
const cabinetMessage = document.getElementById('cabinet-message');

const modal = document.getElementById('stats-modal');
const modalClose = document.querySelector('.close-btn');
const statsContainer = document.getElementById('stats-table-container');

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

function setCookie(name, value, days = 7) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value}; ${expires}; path=/`;
}

function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

function showError(element, message) {
    if (!element) return;
    element.textContent = message;
    element.style.visibility = message ? 'visible' : 'hidden';
}

function clearErrors() {
    showError(authError, '');
    showError(cabinetMessage, '');
}

function updateAuthButton() {
    if (authBtn) {
        authBtn.textContent = currentUser ? currentUser : 'Вход / Регистрация';
    }
}

function validateLoginPassword(login, password) {
    if (login.length < 3) {
        return { isValid: false, message: 'Логин должен содержать не менее 3 символов' };
    }
    if (password.length < 5) {
        return { isValid: false, message: 'Пароль должен содержать не менее 5 символов' };
    }
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

function resetShortUrlAndQR() {
    const shortUrlField = document.getElementById('short-url');
    const qrImage = document.getElementById('qr-image');
    if (shortUrlField) shortUrlField.value = '';
    if (qrImage) qrImage.src = '';
}

async function checkAuth() {
    console.log('Проверка авторизации...');
    try {
        const response = await fetch('/linksinfo', { credentials: 'include' });
        if (response.ok) {
            const links = await response.json();
            userLinks = Array.isArray(links) ? links : [];
            const username = getCookie('username');
            if (username) {
                currentUser = username;
            } else {
                currentUser = 'Пользователь';
                setCookie('username', currentUser, 7);
            }
            updateAuthButton();
            updateCabinetView();
        } else {
            deleteCookie('username');
            currentUser = null;
            userLinks = [];
            updateAuthButton();
            updateCabinetView();
            resetShortUrlAndQR();
        }
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        userLinks = [];
    }
}

function showMainView() {
    mainView.classList.add('active');
    cabinetView.classList.remove('active');
    updateAuthButton();
    clearErrors();
}

function showCabinetView() {
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
    const authForms = document.getElementById('auth-forms');
    const linksList = document.getElementById('links-list');
    if (currentUser) {
        if (authForms) authForms.classList.add('hidden');
        if (linksList) linksList.classList.remove('hidden');
        renderLinks();
    } else {
        if (authForms) authForms.classList.remove('hidden');
        if (linksList) linksList.classList.add('hidden');
        if (authLogin) authLogin.value = '';
        if (authPassword) authPassword.value = '';
        showError(authError, '');
        resetShortUrlAndQR();
    }
}

async function loadLinks() {
    try {
        const response = await fetch('/linksinfo', { credentials: 'include' });
        if (response.ok) {
            const links = await response.json();
            userLinks = Array.isArray(links) ? links : [];
            renderLinks();
            showError(cabinetMessage, '');
        } else if (response.status === 401) {
            deleteCookie('username');
            currentUser = null;
            userLinks = [];
            updateAuthButton();
            updateCabinetView();
        } else {
            showError(cabinetMessage, 'Ошибка загрузки ссылок');
            if (!Array.isArray(userLinks)) userLinks = [];
        }
    } catch (error) {
        console.error('Ошибка загрузки ссылок:', error);
        showError(cabinetMessage, 'Сетевая ошибка при загрузке ссылок');
        if (!Array.isArray(userLinks)) userLinks = [];
    }
}

document.getElementById('login-btn')?.addEventListener('click', async () => {
    const login = authLogin.value.trim();
    const password = authPassword.value;
    const validation = validateLoginPassword(login, password);
    if (!validation.isValid) {
        showError(authError, validation.message);
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
            setCookie('username', login, 7);
            updateAuthButton();
            updateCabinetView();
            showCabinetView();
            await loadLinks();
            showError(authError, '');
            authLogin.value = '';
            authPassword.value = '';
            resetShortUrlAndQR();
        } else {
            if (response.status >= 500) {
                showError(authError, 'Ошибка сервера. Попробуйте позже.');
            } else if (response.status === 400) {
                showError(authError, 'Неверный логин или пароль');
            } else {
                showError(authError, 'Ошибка авторизации');
            }
        }
    } catch (error) {
        console.error('Ошибка при авторизации:', error);
        showError(authError, 'Сетевая ошибка. Проверьте подключение.');
    }
});

document.getElementById('register-btn')?.addEventListener('click', async () => {
    const login = authLogin.value.trim();
    const password = authPassword.value;
    const validation = validateLoginPassword(login, password);
    if (!validation.isValid) {
        showError(authError, validation.message);
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
            setCookie('username', login, 7);
            updateAuthButton();
            updateCabinetView();
            showCabinetView();
            await loadLinks();
            showError(authError, '');
            authLogin.value = '';
            authPassword.value = '';
            resetShortUrlAndQR();
        } else {
            if (response.status >= 500) {
                showError(authError, 'Ошибка сервера. Пожалуйста, попробуйте позже.');
            } else if (response.status === 400) {
                showError(authError, 'Пользователь уже существует');
            } else {
                showError(authError, 'Ошибка регистрации');
            }
        }
    } catch (error) {
        console.error('Ошибка при регистрации:', error);
        showError(authError, 'Сетевая ошибка. Проверьте подключение.');
    }
});

document.getElementById('logout-btn')?.addEventListener('click', async () => {
    if (modal) modal.classList.add('hidden');
    try {
        await fetch('/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
        console.error('Ошибка при выходе:', e);
    } finally {
        deleteCookie('username');
        currentUser = null;
        userLinks = [];
        updateAuthButton();
        updateCabinetView();
        showMainView();
        resetShortUrlAndQR();
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
                <button class="copy-link-btn" data-index="${index}">Копировать</button>
                <button class="download-qr-btn" data-index="${index}">QR-код</button>
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
    } else if (target.classList.contains('copy-link-btn')) {
        e.preventDefault();
        copyLink(parseInt(index));
    } else if (target.classList.contains('download-qr-btn')) {
        e.preventDefault();
        downloadQR(parseInt(index));
    }
}

async function deleteLink(index) {
    if (!Array.isArray(userLinks) || !userLinks[index]) {
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
            const shortUrlField = document.getElementById('short-url');
            if (shortUrlField && shortUrlField.value === link.dst_link) {
                resetShortUrlAndQR();
            }
        } else {
            const errMsg = await response.text();
            showError(cabinetMessage, errMsg || 'Ошибка при удалении');
        }
    } catch (error) {
        console.error('Ошибка удаления:', error);
        showError(cabinetMessage, 'Сетевая ошибка при удалении');
    }
}

function copyToClipboard(text, onError) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('Clipboard API error:', err);
            if (onError) onError();
        });
        return;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        const successful = document.execCommand('copy');
        if (!successful && onError) onError();
    } catch (err) {
        console.error('Fallback copy error:', err);
        if (onError) onError();
    } finally {
        document.body.removeChild(textArea);
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
            html = '<table><thead><tr><th>Браузер</th><th>Время перехода</th><th>ID ссылки</th></tr></thead><tbody>';
            stats.forEach(row => {
                html += `<tr><td>${row.browser || ''}</td><td>${row.timestamp || ''}</td><td>${row.link_id || ''}</td></tr>`;
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
        showError(cabinetMessage, 'Ссылка не может быть пустой');
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
            showError(cabinetMessage, errMsg || 'Ошибка при обновлении');
            cancelEdit(index);
        }
    } catch (error) {
        console.error('Ошибка редактирования:', error);
        showError(cabinetMessage, 'Сетевая ошибка');
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

async function copyLink(index) {
    if (!Array.isArray(userLinks) || !userLinks[index]) {
        await loadLinks();
        return;
    }
    const link = userLinks[index].dst_link;
    copyToClipboard(link, () => {
        showError(cabinetMessage, 'Не удалось скопировать ссылку');
    });
}

async function downloadQR(index) {
    if (!Array.isArray(userLinks) || !userLinks[index]) {
        await loadLinks();
        return;
    }
    const link = userLinks[index].dst_link;
    try {
        const response = await fetch('/generateqrcode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link })
        });
        if (!response.ok) throw new Error('Ошибка генерации QR-кода');
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qrcode-${index}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Ошибка скачивания QR-кода:', error);
        showError(cabinetMessage, 'Не удалось скачать QR-код');
    }
}

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
    const longUrlInput = document.getElementById('long-url');
    const errorDiv = document.getElementById('shorten-error');
    if (!longUrlInput || !errorDiv) return;
    const url = longUrlInput.value.trim();
    showError(errorDiv, '');

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        showError(errorDiv, 'Ссылка должна начинаться с http:// или https://');
        return;
    }

    fetch('/shorten', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 'link': url })
    })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text || `HTTP error! status: ${response.status}`);
                });
            }
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
        .catch(error => {
            console.error('Failed to send link: ', error);
            let errorMsg = error.message;
            if (errorMsg.includes('400') || errorMsg.includes('Bad Request')) {
                errorMsg = 'Ссылка неправильного формата';
            }
            showError(errorDiv, errorMsg || 'Не удалось сократить ссылку');
            resetShortUrlAndQR();
        });
}

function qrcode_generation() {
    const shortUrl = document.getElementById('short-url')?.value;
    if (!shortUrl) {
        console.error('Нет короткой ссылки для генерации QR-кода');
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
        .catch(error => {
            console.error('Failed to generate qr-code: ', error);
            resetShortUrlAndQR();
        });
}

function copyPlainText() {
    const content = document.getElementById('short-url')?.value;
    if (!content) return;
    copyToClipboard(content, () => {
        console.warn('Не удалось скопировать текст');
    });
}

function downloadImage(imgElement) {
    const shortUrlField = document.getElementById('short-url');
    if (!shortUrlField || !shortUrlField.value) {
        console.warn('Нет короткой ссылки, скачивание QR-кода невозможно');
        showError(document.getElementById('shorten-error'), 'Сначала создайте короткую ссылку');
        return;
    }
    if (!imgElement.complete || !imgElement.src || imgElement.src === '') {
        console.warn('QR-код не загружен');
        showError(document.getElementById('shorten-error'), 'QR-код не сгенерирован');
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
    if (img) {
        downloadImage(img);
    } else {
        console.warn('Элемент QR-кода не найден');
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
    const usernameFromCookie = getCookie('username');
    if (usernameFromCookie) {
        currentUser = usernameFromCookie;
        updateAuthButton();
        updateCabinetView();
        checkAuth();
    } else {
        checkAuth();
    }
});

(function setupCookieToast() {
    const COOKIE_CONSENT_KEY = 'cookieConsent';
    const popup = document.getElementById('cookie-popup');
    const closeBtn = document.getElementById('cookie-close');
    if (!popup || !closeBtn) return;
    const consentGiven = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consentGiven) {
        popup.classList.remove('hidden');
    }
    closeBtn.addEventListener('click', () => {
        localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
        popup.classList.add('hidden');
    });
})();

(function setupStudyBanner() {
    const STUDY_BANNER_KEY = 'studyBannerClosed';
    const banner = document.getElementById('study-banner');
    const closeBtn = document.getElementById('close-banner');
    if (!banner || !closeBtn) return;
    const isClosed = localStorage.getItem(STUDY_BANNER_KEY);
    if (!isClosed) {
        banner.classList.remove('hidden');
    }
    closeBtn.addEventListener('click', () => {
        localStorage.setItem(STUDY_BANNER_KEY, 'true');
        banner.classList.add('hidden');
    });
})();