// ===== GESTION DE L'AFFILIATION =====
// Récupérer le paramètre 'ref' dans l'URL et le stocker dans sessionStorage
const urlParams = new URLSearchParams(window.location.search);
const affiliateRef = urlParams.get('ref');
if (affiliateRef) {
    sessionStorage.setItem('affiliateRef', affiliateRef);
}

// ===== GESTION DU FORMULAIRE =====
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('premierPasForm');
    const affOui = document.getElementById('affOui');
    const affNon = document.getElementById('affNon');
    const affiliateIdGroup = document.getElementById('affiliateIdGroup');
    const affiliateIdInput = document.getElementById('affiliateId');

    // Pré-remplir le champ d'affiliation si un ref est présent dans l'URL
    const storedRef = sessionStorage.getItem('affiliateRef');
    if (storedRef) {
        if (affOui) affOui.checked = true;
        if (affiliateIdInput) affiliateIdInput.value = storedRef;
        if (affiliateIdGroup) affiliateIdGroup.style.display = 'block';
    } else {
        if (affNon) affNon.checked = true;
        if (affiliateIdGroup) affiliateIdGroup.style.display = 'none';
    }

    // Afficher/masquer le champ d'affiliation selon le choix
    if (affOui) {
        affOui.addEventListener('change', function() {
            if (this.checked) {
                affiliateIdGroup.style.display = 'block';
                // Recharger la valeur stockée si elle existe
                const ref = sessionStorage.getItem('affiliateRef');
                if (ref) affiliateIdInput.value = ref;
            }
        });
    }
    if (affNon) {
        affNon.addEventListener('change', function() {
            if (this.checked) {
                affiliateIdGroup.style.display = 'none';
                affiliateIdInput.value = '';
            }
        });
    }

    // Gestion du carrousel (si présent)
    initCarousel();

    // Gestion des fichiers uploadés
    initFileUploads();

    // Soumission du formulaire
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const nom = document.getElementById('nom').value.trim();
        const dateNaissance = document.getElementById('dateNaissance').value;
        const poste = document.getElementById('poste').value;
        const codeTournoi = document.getElementById('codeTournoi').value.trim();
        const diplome = document.getElementById('diplome').value.trim();
        const telephone = document.getElementById('telephone').value.trim();
        const certifie = document.getElementById('certifie').checked;
        const affiliationValue = affOui.checked ? affiliateIdInput.value : null;

        if (!nom || !dateNaissance || !poste || !diplome || !telephone || !certifie) {
            alert('Veuillez remplir tous les champs obligatoires.');
            return;
        }

        const diplomeFile = document.getElementById('diplomeFile').files[0];
        const pieceFile = document.getElementById('pieceIdentite').files[0];
        const diplomeFileName = diplomeFile ? diplomeFile.name : '';
        const pieceFileName = pieceFile ? pieceFile.name : '';

        const inscription = {
            id: Date.now(),
            nom,
            dateNaissance,
            poste,
            codeTournoi: codeTournoi || '',
            diplome,
            telephone,
            certifie,
            diplomeFileName,
            pieceFileName,
            affilié: affiliationValue, // ← ici on lie l'affilié
            statut: 'en_attente',
            dateSoumission: new Date().toLocaleString('fr-FR')
        };

        let inscriptions = JSON.parse(localStorage.getItem('premiers_pas_inscriptions')) || [];
        inscriptions.push(inscription);
        localStorage.setItem('premiers_pas_inscriptions', JSON.stringify(inscriptions));

        const trackingUrl = `suivi.html?id=${inscription.id}`;
        showSuccessModal(trackingUrl);
        form.reset();
        resetFileUploads();
        // Réinitialiser l'affichage de l'affiliation
        if (!storedRef) {
            affNon.checked = true;
            affiliateIdGroup.style.display = 'none';
        }
    });
});

// ===== FONCTIONS ANNEXES =====
function initCarousel() {
    // Code du carrousel (si présent dans la page)
    const slides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');
    let currentSlide = 0;
    let slideInterval;

    function showSlide(index) {
        if (index < 0) index = slides.length - 1;
        if (index >= slides.length) index = 0;
        slides.forEach(slide => slide.classList.remove('active'));
        slides[index].classList.add('active');
        indicators.forEach(ind => ind.classList.remove('active'));
        indicators[index].classList.add('active');
        currentSlide = index;
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function startCarousel() {
        slideInterval = setInterval(nextSlide, 5000);
    }

    function stopCarousel() {
        clearInterval(slideInterval);
    }

    if (slides.length > 0) {
        showSlide(0);
        startCarousel();
        const hero = document.getElementById('heroCarousel');
        if (hero) {
            hero.addEventListener('mouseenter', stopCarousel);
            hero.addEventListener('mouseleave', startCarousel);
        }
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                stopCarousel();
                showSlide(index);
                startCarousel();
            });
        });
    }
}

function initFileUploads() {
    const fileUploads = document.querySelectorAll('.file-upload-box');
    fileUploads.forEach(box => {
        const input = box.querySelector('input[type="file"]');
        const icon = box.querySelector('i');
        const text = box.querySelector('span');

        if (input) {
            input.addEventListener('change', function(e) {
                if (this.files && this.files[0]) {
                    const fileName = this.files[0].name;
                    text.textContent = fileName;
                    icon.style.color = 'var(--primary)';
                    box.style.borderColor = 'var(--primary)';
                } else {
                    text.textContent = 'Cliquez pour télécharger';
                    icon.style.color = 'var(--gold)';
                    box.style.borderColor = 'var(--gold)';
                }
            });
        }
    });
}

function resetFileUploads() {
    document.querySelectorAll('.file-upload-box').forEach(box => {
        const span = box.querySelector('span');
        if (span) span.textContent = 'Cliquez pour télécharger';
        box.style.borderColor = '#ffcc00';
    });
}

function showSuccessModal(url) {
    const modal = document.getElementById('successModal');
    const linkSpan = document.getElementById('trackingLink');
    if (modal && linkSpan) {
        linkSpan.textContent = url;
        modal.classList.add('active');
    } else {
        alert(`Inscription enregistrée ! Suivez votre dossier ici : ${url}`);
    }
}

window.closeSuccessModal = () => {
    const modal = document.getElementById('successModal');
    if (modal) modal.classList.remove('active');
};

// Gestion de la copie du lien de suivi
document.addEventListener('click', (e) => {
    if (e.target.closest('#copyTrackingBtn')) {
        const link = document.getElementById('trackingLink')?.textContent;
        if (link) {
            navigator.clipboard.writeText(link).then(() => {
                const btn = document.getElementById('copyTrackingBtn');
                btn.innerHTML = '<i class="fas fa-check"></i> Copié !';
                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-copy"></i> Copier';
                }, 2000);
            }).catch(() => {
                alert('Erreur de copie');
            });
        }
    }
});