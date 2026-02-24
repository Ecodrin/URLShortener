function send_link() {
        fetch('/shorten', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }, body: JSON.stringify({'link': document.getElementById('long-url').value})
    })

        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            let short_url_field = document.getElementById('short-url');
            short_url_field.value = data['link'];
        })
        .catch(error => console.error('Failed to send link: ', error));
}

async function copyPlainText() {
    const content = document.getElementById('short-url').value;
    try {
        console.log(content);
        await navigator.clipboard.writeText(content);
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
}
