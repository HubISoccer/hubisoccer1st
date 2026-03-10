// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// ===== RÉCUPÉRATION DU PARRAIN (ref) DANS L'URL =====
const urlParams = new URLSearchParams(window.location.search);
const ref = urlParams.get('ref');
if (ref) sessionStorage.setItem('affiliateRef', ref);

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('premierPasForm');
    const affOui = document.getElementById('affOui');
    const affNon = document.getElementById('affNon');
    const affiliateIdGroup = document.getElementById('affiliateIdGroup');
    const affiliateIdInput = document.getElementById('affiliateId');
    const submitBtn = document.getElementById('submitBtn');

    // Pré-remplir si un ref est présent
    const storedRef = sessionStorage.getItem('affiliateRef');
    if (storedRef) {
        affOui.checked = true;
        affiliateIdInput.value = storedRef;
        affiliateIdGroup.style.display = 'block';
    } else {
        affNon.checked = true;
        affiliateIdGroup.style.display = 'none';
    }

    affOui.addEventListener('change', function() {
        affiliateIdGroup.style.display = this.checked ? 'block' : 'none';
        if (this.checked) {
            const ref = sessionStorage.getItem('affiliateRef');
            if (ref) affiliateIdInput.value = ref;
        }
    });
    affNon.addEventListener('change', function() {
        affiliateIdGroup.style.display = 'none';
        affiliateIdInput.value = '';
    });

    initCarousel();
    initFileUploads();

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Récupération des champs
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

        if (!diplomeFile || !pieceFile) {
            alert('Veuillez sélectionner les deux fichiers requis.');
            return;
        }

        // Désactiver le bouton pendant l'upload
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Téléversement...';

        const inscriptionId = Date.now(); // ID unique

        // Récupération des conteneurs et indicateurs
        const diplomeBox = document.getElementById('upload-diplome');
        const pieceBox = document.getElementById('upload-piece');
        const diplomeIndicator = diplomeBox.querySelector('.progress-indicator');
        const pieceIndicator = pieceBox.querySelector('.progress-indicator');

        // Afficher les indicateurs
        diplomeIndicator.style.display = 'flex';
        pieceIndicator.style.display = 'flex';

        // Fonction d'upload avec progression
        async function uploadFileWithProgress(file, fileType, box, indicator) {
            return new Promise((resolve, reject) => {
                const fileName = `${inscriptionId}_${fileType}.${file.name.split('.').pop()}`;
                
                // 1. Obtenir une URL signée pour l'upload
                supabaseClient.storage
                    .from('documents')
                    .createSignedUploadUrl(fileName)
                    .then(({ data, error }) => {
                        if (error) {
                            reject(error);
                            return;
                        }

                        const xhr = new XMLHttpRequest();
                        xhr.open('PUT', data.signedUrl, true);
                        xhr.setRequestHeader('Content-Type', file.type);

                        // Suivi de progression
                        xhr.upload.addEventListener('progress', (e) => {
                            if (e.lengthComputable) {
                                const percent = Math.round((e.loaded / e.total) * 100);
                                const circle = box.querySelector('.progress-bar');
                                const text = box.querySelector('.progress-text');
                                // Périmètre du cercle : 2πr = 2*3.14*18 ≈ 113.1
                                const dashOffset = 113.1 * (1 - percent / 100);
                                circle.style.strokeDashoffset = dashOffset;
                                text.textContent = percent + '%';
                            }
                        });

                        xhr.addEventListener('load', () => {
                            if (xhr.status === 200) {
                                box.classList.add('success');
                                box.classList.remove('uploading');
                                const text = box.querySelector('.progress-text');
                                text.textContent = '✓';
                                resolve(fileName);
                            } else {
                                box.classList.remove('uploading');
                                reject(new Error('Upload failed'));
                            }
                        });

                        xhr.addEventListener('error', () => {
                            box.classList.remove('uploading');
                            reject(new Error('Network error'));
                        });

                        // Marquer le début de l'upload
                        box.classList.add('uploading');
                        xhr.send(file);
                    })
                    .catch(reject);
            });
        }

        try {
            // Lancer les deux uploads en parallèle
            const [diplomePath, piecePath] = await Promise.all([
                uploadFileWithProgress(diplomeFile, 'diplome', diplomeBox, diplomeIndicator),
                uploadFileWithProgress(pieceFile, 'piece', pieceBox, pieceIndicator)
            ]);

            // Insertion dans la base de données
            const inscription = {
                id: inscriptionId,
                nom,
                datenaissance: dateNaissance,
                poste,
                codetournoi: codeTournoi || '',
                diplome,
                telephone,
                diplomefilename: diplomePath,
                piecefilename: piecePath,
                "affilié": affiliationValue,
                statut: 'en_attente',
                datesoumission: new Date().toISOString()
            };

            const { error } = await supabaseClient
                .from('inscriptions')
                .insert([inscription]);

            if (error) throw error;

            // Succès : afficher la modale
            const trackingUrl = `suivi.html?id=${inscriptionId}`;
            showSuccessModal(trackingUrl);
            
            // Réinitialisation du formulaire
            form.reset();
            resetFileUploads();
            if (!storedRef) {
                affNon.checked = true;
                affiliateIdGroup.style.display = 'none';
            }
            // Cacher les indicateurs
            diplomeIndicator.style.display = 'none';
            pieceIndicator.style.display = 'none';
            diplomeBox.classList.remove('success', 'uploading');
            pieceBox.classList.remove('success', 'uploading');

        } catch (error) {
            console.error('Erreur lors de l\'inscription :', error);
            alert('Une erreur est survenue. Veuillez réessayer.');
            // En cas d'erreur, réactiver le bouton
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Valider mon Premier Pas';
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

    function nextSlide() { showSlide(currentSlide + 1); }
    function startCarousel() { slideInterval = setInterval(nextSlide, 5000); }
    function stopCarousel() { clearInterval(slideInterval); }

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
    document.querySelectorAll('.file-upload-box').forEach(box => {
        const input = box.querySelector('input[type="file"]');
        const icon = box.querySelector('i');
        const text = box.querySelector('span');
        if (input) {
            input.addEventListener('change', function() {
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
        const icon = box.querySelector('i');
        if (icon) icon.style.color = 'var(--gold)';
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
    document.getElementById('successModal')?.classList.remove('active');
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
            }).catch(() => alert('Erreur de copie'));
        }
    }
});