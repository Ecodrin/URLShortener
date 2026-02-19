function send_link() {
    fetch('http://server/shorten', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }, body: JSON.stringify(document.getElementById('long-url').value)
    })

        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => console.log('Успех:', data))
        .catch(error => console.error('Ошибка:', error));
}