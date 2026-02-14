// Находим все кнопки и все панели с контентом
const buttons = document.querySelectorAll('.tab-button');
const panes = document.querySelectorAll('.tab-pane');

// Добавляем обработчик на каждую кнопку
buttons.forEach(button => {
    button.addEventListener('click', () => {
        // Убираем класс active у всех кнопок
        buttons.forEach(btn => btn.classList.remove('active'));
        // Добавляем класс active текущей кнопке
        button.classList.add('active');

        // Скрываем все панели
        panes.forEach(pane => pane.classList.remove('active'));

        // Показываем панель, соответствующую data-tab атрибуту кнопки
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});