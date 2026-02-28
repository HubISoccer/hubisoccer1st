// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// ===== RÉCUPÉRATION DU PARRAIN (ref) DANS L'URL =====
const urlParams = new URLSearchParams(window.location.search);
const ref = urlParams.get('ref');
if (ref) {
    sessionStorage.setItem('affiliateRef', ref);
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('premierPasForm');
    const affOui = document.getElementById('affOui');
    const affNon = document.getElementById('affNon');
    const affiliateIdGroup = document.getElementById('affiliateIdGroup');
    const affiliateIdInput = document.getElementById('affiliateId');

    // Pré-remplir le champ d'affiliation si un ref est présent dans l'URL
    const storedRef = sessionStorage.getItem('affiliateRef');
    if (storedRef) {
        affOui.checked = true;
        affiliateIdInput.value = storedRef;
        affiliateIdGroup.style.display = 'block';
    } else {
        affNon.checked = true;
        affiliateIdGroup.style.display = 'none';
    }

    // Afficher/masquer le champ d'affiliation selon le choix
    affOui.addEventListener('change', function() {
        if (this.checked) {
            affiliateIdGroup.style.display = 'block';
            const ref = sessionStorage.getItem('affiliateRef');
            if (ref) affiliateIdInput.value = ref;
        }
    });
    affNon.addEventListener('change', function() {
        if (this.checked) {
            affiliateIdGroup.style.display = 'none';
            affiliateIdInput.value = '';
        }
    });

    // Gestion du carrousel (si présent)
    initCarousel();

    // Gestion des fichiers uploadés
    initFileUploads();

    // Soumission du formulaire
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nom = document.getElementById('nom').value.trim();
        const dateNaissance = document.getElementById('dateNaissance').value; // champ HTML
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

        // Construction de l'objet avec les noms exacts des colonnes (issus de la capture)
        const inscription = {
            id: Date.now(),
            nom,
            datenaissance: dateNaissance,           // correspond à la colonne 'datenaissance'
            poste,
            codetournoi: codeTournoi || '',         // correspond à 'codetournoi'
            diplome,
            telephone,
            diplomefilename: diplomeFileName,       // correspond à 'diplomefilename'
            piecefilename: pieceFileName,           // correspond à 'piecefilename'
            "affilié": affiliationValue,             // la colonne a un accent, on met des guillemets
            statut: 'en_attente',
            datesoumission: new Date().toLocaleString('fr-FR') // correspond à 'datesoumission'
        };

        console.log('Données envoyées :', inscription); // Pour déboguer

        // Insertion dans Supabase
        const { error } = await supabaseClient
            .from('inscriptions')
            .insert([inscription]);

        if (error) {
            console.error('Erreur lors de l\'inscription :', error);
            alert('Une erreur est survenue. Veuillez réessayer.');
            return;
        }

        // Si tout va bien, afficher la modale avec le lien de suivi
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
