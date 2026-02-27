document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    let playerId = urlParams.get('id');

    // Si pas dans l'URL, essayer sessionStorage (comme dans examen.js)
    if (!playerId) {
        playerId = sessionStorage.getItem('currentExamId');
    }

    const hubIdSpan = document.getElementById('hubId');
    const suiviLink = document.getElementById('suiviLink');
    const copyBtn = document.getElementById('copyIdBtn');

    if (!playerId) {
        hubIdSpan.textContent = 'ID non disponible';
        if (suiviLink) suiviLink.href = 'index.html';
        return;
    }

    // Générer l'ID formaté (par exemple: 123HU018BI26022026)
    // On peut le faire à partir de l'ID existant + date
    function generateHubId(baseId) {
        const now = new Date();
        const day = now.getDate().toString().padStart(2, '0');
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const year = now.getFullYear();
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        // Format: baseId tronqué + HU + age (ex 18) + BI + jour mois année
        const shortBase = baseId.toString().slice(-3);
        return `${shortBase}HU018BI${day}${month}${year}`;
    }

    const hubId = generateHubId(playerId);
    hubIdSpan.textContent = hubId;

    // Mettre à jour le lien de suivi
    if (suiviLink) {
        suiviLink.href = `suivi.html?id=${playerId}`;
    }

    // Copier l'ID
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