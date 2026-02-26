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
            qrcode_generation();
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
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({'link': document.getElementById('short-url').value})
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

function downloadImage(imgElement) {
    if (!imgElement.complete) {
        alert('Image is not loaded yet.');
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

document.getElementById('download-qr-btn').addEventListener('click', function() {
    const img = document.getElementById('qr-image');
    downloadImage(img);
});

async function copyPlainText() {
    const content = document.getElementById('short-url').value;
    try {
        console.log(content);
        await navigator.clipboard.writeText(content);
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
}
