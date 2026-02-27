// Fonction pour sauvegarder un affilié avec toutes ses données
function saveAffiliate(data) {
    let affiliates = JSON.parse(localStorage.getItem('affiliates')) || [];
    affiliates.push(data);
    localStorage.setItem('affiliates', JSON.stringify(affiliates));
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('affiliationForm');
    const resultArea = document.getElementById('resultArea');
    const affLinkSpan = document.getElementById('affLink');
    const copyBtn = document.getElementById('copyBtn');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const type = document.querySelector('input[name="type"]:checked')?.value;
        const pays = document.getElementById('pays').value;
        const nom = document.getElementById('nom').value.trim();
        const telephone = document.getElementById('telephone').value.trim();
        const paiement = document.getElementById('paiement').value;

        if (!pays || !nom || !telephone || !paiement) {
            alert('Veuillez remplir tous les champs obligatoires.');
            return;
        }

        const affiliateId = 'aff_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

        const affiliate = {
            id: affiliateId,
            type,
            pays,
            nom,
            telephone,
            paiement,
            date: new Date().toISOString(),
            count: 0, // nombre de parrainages (inscriptions ou achats validés)
            valide: false // statut de validation par l'admin
        };

        saveAffiliate(affiliate);

        const baseUrl = window.location.origin + '/hubisoccer1st'; // À adapter si besoin
        let targetPath;
        if (type === 'joueur') {
            targetPath = '/premier-pas.html';
        } else {
            targetPath = '/e-marketing-hubisoccer.html';
        }
        const link = `${baseUrl}${targetPath}?ref=${encodeURIComponent(affiliateId)}`;

        affLinkSpan.textContent = link;
        resultArea.style.display = 'block';
    });

    copyBtn.addEventListener('click', () => {
        const link = affLinkSpan.textContent;
        if (link) {
            navigator.clipboard.writeText(link).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copié !';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copier';
                }, 2000);
            }).catch(err => {
                alert('Erreur de copie : ' + err);
            });
        }
    });
});

// Fonction FAQ (à garder si utilisée)
function toggleFaq(element) {
    const answer = element.nextElementSibling;
    const icon = element.querySelector('i');
    element.classList.toggle('active');
    if (answer.classList.contains('show')) {
        answer.classList.remove('show');
    } else {
        answer.classList.add('show');
    }
    if (icon) {
        icon.style.transform = element.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0)';
    }
}