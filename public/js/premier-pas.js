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

    // Gestion du carrousel
    initCarousel();

    // Gestion des fichiers uploadés
    initFileUploads();

    // Soumission du formulaire
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
        const diplomeFileName = diplomeFile ? diplomeFile.name : '';
        const pieceFileName = pieceFile ? pieceFile.name : '';

        const inscription = {
            id: Date.now(),
            nom,
            datenaissance: dateNaissance,
            poste,
            codetournoi: codeTournoi || '',
            diplome,
            telephone,
            diplomefilename: diplomeFileName,
            piecefilename: pieceFileName,
            "affilié": affiliationValue,
            statut: 'en_attente',
            datesoumission: new Date().toISOString()  // ← format ISO accepté par PostgreSQL
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

        const trackingUrl = `suivi.html?id=${inscription.id}`;
        showSuccessModal(trackingUrl);
        form.reset();
        resetFileUploads();
        if (!storedRef) {
            affNon.checked = true;
            affiliateIdGroup.style.display = 'none';
        }
    });
});

// ... (le reste des fonctions annexes inchangé)
