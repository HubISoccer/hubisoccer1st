const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseSpacePublic = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentId = null;

function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}"></i></div>
        <div class="toast-content">${escapeHtml(message)}</div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    container.appendChild(toast);
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.animation = 'fadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    });
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'fadeOut 0.3s forwards';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function showLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';
}
function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function checkStatus(id) {
    if (!id || id.trim() === '') {
        showToast('Veuillez saisir un identifiant.', 'warning');
        return;
    }

    showLoader();
    try {
        const { data, error } = await supabaseSpacePublic
            .from('inscriptions')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            showToast('Identifiant introuvable. Vérifiez le code saisi.', 'error');
            document.getElementById('resultCard').style.display = 'none';
            return;
        }

        displayResult(data);
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la vérification.', 'error');
        document.getElementById('resultCard').style.display = 'none';
    } finally {
        hideLoader();
    }
}

function displayResult(inscription) {
    const statusMap = {
        pending: { label: 'En attente de validation', class: 'pending' },
        approved: { label: 'Approuvé', class: 'approved' },
        rejected: { label: 'Rejeté', class: 'rejected' }
    };
    const status = statusMap[inscription.status] || statusMap.pending;

    document.getElementById('statusBadge').textContent = status.label;
    document.getElementById('statusBadge').className = `status-badge ${status.class}`;
    document.getElementById('applicantName').textContent = inscription.full_name || 'Candidat';

    const infoGrid = document.getElementById('infoGrid');
    infoGrid.innerHTML = `
        <div class="info-item"><strong>ID candidature</strong><span>${escapeHtml(inscription.id)}</span></div>
        <div class="info-item"><strong>Sport</strong><span>${escapeHtml(inscription.sport)}</span></div>
        <div class="info-item"><strong>Date de soumission</strong><span>${formatDate(inscription.created_at)}</span></div>
        <div class="info-item"><strong>Téléphone</strong><span>${escapeHtml(inscription.phone)}</span></div>
        <div class="info-item"><strong>Diplôme / formation</strong><span>${escapeHtml(inscription.diploma_title)}</span></div>
        ${inscription.parent_name ? `<div class="info-item"><strong>Parent / tuteur</strong><span>${escapeHtml(inscription.parent_name)}</span></div>` : ''}
    `;

    const sportDataDiv = document.getElementById('sportData');
    if (inscription.sport_data && Object.keys(inscription.sport_data).length > 0) {
        let sportHtml = `<h3>Informations sportives</h3><div class="sport-data-grid">`;
        for (const [key, value] of Object.entries(inscription.sport_data)) {
            if (value) {
                sportHtml += `<div class="info-item"><strong>${formatSportKey(key)}</strong><span>${escapeHtml(value)}</span></div>`;
            }
        }
        sportHtml += `</div>`;
        sportDataDiv.innerHTML = sportHtml;
        sportDataDiv.style.display = 'block';
    } else {
        sportDataDiv.style.display = 'none';
    }

    const adminNotesDiv = document.getElementById('adminNotes');
    if (inscription.admin_notes) {
        adminNotesDiv.innerHTML = `<strong><i class="fas fa-comment"></i> Message de l'équipe :</strong><br>${escapeHtml(inscription.admin_notes)}`;
        adminNotesDiv.style.display = 'block';
    } else {
        adminNotesDiv.style.display = 'none';
    }

    document.getElementById('resultCard').style.display = 'block';
}

function formatSportKey(key) {
    const labels = {
        poste: 'Poste',
        piedDominant: 'Pied dominant',
        taille: 'Taille',
        poids: 'Poids',
        statistiques: 'Statistiques',
        club: 'Club',
        anneesPratique: 'Années de pratique',
        niveau: 'Niveau',
        mainDominante: 'Main dominante',
        envergure: 'Envergure',
        detente: 'Détente',
        typeJeu: 'Type de jeu',
        coupDroit: 'Coup droit',
        revers: 'Revers',
        classement: 'Classement',
        surfacePref: 'Surface préférée',
        meilleurResultat: 'Meilleur résultat',
        vitesseService: 'Vitesse de service',
        discipline: 'Discipline',
        meilleurePerf: 'Meilleure performance',
        record100: 'Record 100m',
        record10k: 'Record 10km',
        entrainementsSemaine: 'Entraînements/semaine',
        blessures: 'Blessures',
        vitesseTir: 'Vitesse de tir',
        detenteAttaque: 'Détente attaque',
        detenteContre: 'Détente contre',
        vitesse40: 'Vitesse 40m',
        plaquage: 'Plaquage',
        matchsSaison: 'Matchs saison',
        nage: 'Nage',
        meilleur50: 'Meilleur 50m',
        meilleur100: 'Meilleur 100m',
        meilleur200: 'Meilleur 200m',
        chrono50: 'Chrono 50m',
        grade: 'Grade / Ceinture',
        poidsCompetition: 'Poids compétition',
        palmares: 'Palmarès',
        specialite: 'Spécialité technique',
        preparationPhysique: 'Préparation physique',
        ftp: 'FTP (watts)',
        fcm: 'Fréquence cardiaque max',
        kmSemaine: 'Km/semaine'
    };
    return labels[key] || key;
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get('id');
    const input = document.getElementById('trackingId');
    const checkBtn = document.getElementById('checkBtn');

    if (idFromUrl) {
        input.value = idFromUrl;
        checkStatus(idFromUrl);
    }

    checkBtn.addEventListener('click', () => {
        checkStatus(input.value.trim());
    });

    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            menuToggle.classList.toggle('open');
        });
        document.addEventListener('click', (e) => {
            if (!navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
                navLinks.classList.remove('active');
                menuToggle.classList.remove('open');
            }
        });
    }
});
