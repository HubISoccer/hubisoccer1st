document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const hubId = urlParams.get('id');           // ID formaté (ex: 123HU018BI04032026)
    const realId = urlParams.get('realId');       // ID numérique réel (ex: 1772603338865)

    const hubIdSpan = document.getElementById('hubId');
    const suiviLink = document.getElementById('suiviLink');
    const copyBtn = document.getElementById('copyIdBtn');

    if (!hubId || !realId) {
        hubIdSpan.textContent = 'ID non disponible';
        if (suiviLink) suiviLink.href = 'index.html';
        return;
    }

    hubIdSpan.textContent = hubId;

    // Mettre à jour le lien de suivi avec l'ID réel
    if (suiviLink) {
        suiviLink.href = `suivi.html?id=${realId}`;
    }

    // Copier l'ID formaté
    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(hubId).then(() => {
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copié !';
            copyBtn.classList.add('copied');
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copier';
                copyBtn.classList.remove('copied');
            }, 2000);
        }).catch(err => {
            alert('Erreur de copie : ' + err);
        });
    });
});