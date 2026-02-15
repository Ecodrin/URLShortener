const buttons = document.querySelectorAll('.tab-button');
const panes = document.querySelectorAll('.tab-pane');

buttons.forEach(button => {
    button.addEventListener('click', () => {
        buttons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        panes.forEach(pane => pane.classList.remove('active'));

        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});