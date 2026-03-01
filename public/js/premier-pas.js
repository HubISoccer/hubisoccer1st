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

    // Pré-remplir le champ d'affiliation si un ref est présent
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

    initCarousel();
    initFileUploads();

    form.addEventListener('submit', async (e) => {
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
        const inscriptionId = Date.now(); // ID unique

        // Upload des fichiers (si présents)
        let diplomePath = '';
        let piecePath = '';

        if (diplomeFile) {
            const fileExt = diplomeFile.name.split('.').pop();
            const fileName = `${inscriptionId}_diplome.${fileExt}`;
            const { error: uploadError } = await supabaseClient.storage
                .from('documents')
                .upload(fileName, diplomeFile);
            if (uploadError) {
                console.error('Erreur upload diplôme:', uploadError);
                alert('Erreur lors du téléversement du diplôme. Veuillez réessayer.');
                return;
            }
            diplomePath = fileName;
        }

        if (pieceFile) {
            const fileExt = pieceFile.name.split('.').pop();
            const fileName = `${inscriptionId}_piece.${fileExt}`;
            const { error: uploadError } = await supabaseClient.storage
                .from('documents')
                .upload(fileName, pieceFile);
            if (uploadError) {
                console.error('Erreur upload pièce:', uploadError);
                alert('Erreur lors du téléversement de la pièce. Veuillez réessayer.');
                return;
            }
            piecePath = fileName;
        }

        // Construction de l'objet avec les noms exacts des colonnes
        const inscription = {
            id: inscriptionId,
            nom,
            datenaissance: dateNaissance,
            poste,
            codetournoi: codeTournoi || '',
            diplome,
            telephone,
            diplomefilename: diplomePath,   // chemin du fichier
            piecefilename: piecePath,       // chemin du fichier
            "affilié": affiliationValue,
            statut: 'en_attente',
            datesoumission: new Date().toISOString()
        };

        console.log('Données envoyées :', inscription);

        const { error } = await supabaseClient
            .from('inscriptions')
            .insert([inscription]);

        if (error) {
            console.error('Erreur lors de l\'inscription :', error);
            alert('Une erreur est survenue. Veuillez réessayer.');
            return;
        }

        const trackingUrl = `suivi.html?id=${inscriptionId}`;
        showSuccessModal(trackingUrl);
        form.reset();
        resetFileUploads();
        if (!storedRef) {
            affNon.checked = true;
            affiliateIdGroup.style.display = 'none';
        }
    });
});

// ===== FONCTIONS ANNEXES =====
function initCarousel() { /* ... */ }
function initFileUploads() { /* ... */ }
function resetFileUploads() { /* ... */ }
function showSuccessModal(url) { /* ... */ }
window.closeSuccessModal = () => { /* ... */ }

// Copie du lien de suivi
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

// N'oublie pas de copier les fonctions annexes si elles manquent (car dans le code précédent elles étaient définies). 
// Je les ai omises pour la lisibilité, mais tu dois les conserver.
