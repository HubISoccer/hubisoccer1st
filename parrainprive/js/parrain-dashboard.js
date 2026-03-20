// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseParrainsSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉLÉMENTS DOM =====
// Navbar & sidebar
const userMenu = document.getElementById('userMenu');
const userDropdown = document.getElementById('userDropdown');
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.getElementById('closeSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const logoutLink = document.getElementById('logoutLink');
const logoutLinkSidebar = document.getElementById('logoutLinkSidebar');
const userNameSpan = document.getElementById('userName');
const userAvatar = document.getElementById('userAvatar');
const notifBadge = document.getElementById('notifBadge');

// Profil (carte de gauche)
const profileDisplay = document.getElementById('profileDisplay');
const fileInput = document.getElementById('fileInput');
const dashboardName = document.getElementById('dashboardName');
const playerPseudo = document.getElementById('playerPseudo');
const playerPhone = document.getElementById('playerPhone');
const playerEmail = document.getElementById('playerEmail');
const playerCountryFlag = document.getElementById('playerCountryFlag');
const playerCountryName = document.getElementById('playerCountryName');
const parrainFullName = document.getElementById('parrainFullName');
const parrainEmail = document.getElementById('parrainEmail');
const parrainPhone = document.getElementById('parrainPhone');
const memberSince = document.getElementById('memberSince');
const parrainID = document.getElementById('parrainID');
const profileCompletion = document.getElementById('profileCompletion');
const totalDons = document.getElementById('totalDons');
const nbJoueursSoutenus = document.getElementById('nbJoueursSoutenus');

// Statistiques
const totalDonsValue = document.getElementById('totalDonsValue');
const joueursSoutenusValue = document.getElementById('joueursSoutenusValue');
const lastDonDate = document.getElementById('lastDonDate');
const licenseStatus = document.getElementById('licenseStatus');

// Listes
const recentDonationsList = document.getElementById('recentDonationsList');
const recentPlayersList = document.getElementById('recentPlayersList');
const recentMessagesList = document.getElementById('recentMessagesList');

// Graphique
const donationsChart = document.getElementById('donationsChart');

// ===== ÉTAT GLOBAL =====
let currentParrain = null;

// ===== TOAST =====
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
        <div class="toast-content">${message}</div>
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

// ===== LOADER GLOBAL =====
function showLoader(show = true) {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = show ? 'flex' : 'none';
}

// ===== VÉRIFICATION DE SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabaseParrainsSpacePrive.auth.getSession();
        if (error || !session) {
            window.location.href = '../public/auth/login.html';
            return null;
        }

        // Récupérer le profil depuis la table unifiée `profiles`
        const { data: profile, error: profileError } = await supabaseParrainsSpacePrive
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

        if (profileError || !profile) {
            console.error('Erreur chargement profil:', profileError);
            window.location.href = '../public/auth/login.html';
            return null;
        }

        // Vérifier que l'utilisateur a bien le rôle 'parrain' (optionnel)
        if (profile.role !== 'parrain') {
            showToast('Accès non autorisé', 'error');
            setTimeout(() => { window.location.href = '../index.html'; }, 2000);
            return null;
        }

        currentParrain = profile;
        updateUserUI();
        loadParrainData();
        return profile;
    } catch (err) {
        console.error('Erreur checkSession:', err);
        window.location.href = '../public/auth/login.html';
    }
}

function updateUserUI() {
    if (!currentParrain) return;

    const fullName = currentParrain.full_name || 'Parrain';
    userNameSpan.textContent = fullName;
    if (currentParrain.avatar_url) {
        const avatarUrlWithTimestamp = `${currentParrain.avatar_url}?t=${new Date().getTime()}`;
        userAvatar.src = avatarUrlWithTimestamp;
        profileDisplay.src = avatarUrlWithTimestamp;
    }

    // Informations de la carte de gauche
    dashboardName.textContent = fullName;
    playerPseudo.textContent = currentParrain.username || '-';
    
    // Récupérer les informations de contact depuis contact_info (jsonb)
    const contact = currentParrain.contact_info || {};
    playerPhone.textContent = contact.phone || '-';
    playerEmail.textContent = contact.email || currentParrain.email || '-';
    
    // Drapeau et pays
    const country = contact.country || currentParrain.country || '';
    playerCountryName.textContent = country || '-';
    // Mapping simple des drapeaux (à enrichir)
    const flagMap = {
        'Bénin': '🇧🇯', 'France': '🇫🇷', 'Côte d\'Ivoire': '🇨🇮', 'Sénégal': '🇸🇳',
        'Cameroun': '🇨🇲', 'Maroc': '🇲🇦', 'Tunisie': '🇹🇳', 'Algérie': '🇩🇿',
        'Nigeria': '🇳🇬', 'Ghana': '🇬🇭'
    };
    playerCountryFlag.textContent = flagMap[country] || '🌍';

    // Informations de l'en-tête
    parrainFullName.textContent = fullName;
    parrainEmail.textContent = currentParrain.email || '-';
    parrainPhone.textContent = contact.phone || '-';

    // Date d'inscription
    if (currentParrain.created_at) {
        memberSince.textContent = new Date(currentParrain.created_at).toLocaleDateString('fr-FR');
    } else {
        memberSince.textContent = '-';
    }

    // ID HubISoccer (à adapter si vous avez un champ `hub_id`)
    parrainID.textContent = `ID: ${currentParrain.hub_id || currentParrain.id}`;
}

// ===== CHARGEMENT DES DONNÉES SPÉCIFIQUES =====
async function loadParrainData() {
    if (!currentParrain) return;
    showLoader(true);
    try {
        await Promise.all([
            loadTransactions(),
            loadSoutiens(),
            loadRecentMessages(),
            loadLicenseStatus()
        ]);
        calculateProfileCompletion();
    } catch (error) {
        console.error('Erreur chargement données:', error);
        showToast('Erreur lors du chargement des données', 'error');
    } finally {
        showLoader(false);
    }
}

async function loadTransactions() {
    // Table unifiée `transactions` ou spécifique `parrain_transactions` ?
    // On suppose qu'il existe une table `transactions` avec un champ `user_id` et `type`
    const { data, error } = await supabaseParrainsSpacePrive
        .from('transactions')
        .select('*')
        .eq('user_id', currentParrain.id)
        .eq('type', 'don')  // ou tout type correspondant
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erreur chargement transactions:', error);
        return;
    }

    const total = data.reduce((sum, t) => sum + t.amount, 0);
    totalDons.textContent = total.toLocaleString('fr-FR');
    totalDonsValue.textContent = total.toLocaleString('fr-FR') + ' FCFA';

    if (data.length > 0) {
        const last = data[0];
        lastDonDate.textContent = new Date(last.created_at).toLocaleDateString('fr-FR');
    } else {
        lastDonDate.textContent = 'Aucun';
    }

    // Derniers dons
    const recent = data.slice(0, 5);
    if (recent.length === 0) {
        recentDonationsList.innerHTML = '<p class="no-data">Aucun don pour le moment.</p>';
    } else {
        recentDonationsList.innerHTML = recent.map(t => `
            <div class="recent-item">
                <div class="date">${new Date(t.created_at).toLocaleDateString('fr-FR')}</div>
                <div class="main">${t.amount.toLocaleString('fr-FR')} FCFA</div>
                <div class="sub">${t.description || 'don'}</div>
            </div>
        `).join('');
    }

    prepareChart(data);
}

async function loadSoutiens() {
    // Table `supports` ou `sponsorships` liant parrain et joueur
    const { data, error } = await supabaseParrainsSpacePrive
        .from('supports')
        .select(`
            *,
            player:profiles!joueur_id (full_name, avatar_url)
        `)
        .eq('parrain_id', currentParrain.id)
        .order('date_debut', { ascending: false });

    if (error) {
        console.error('Erreur chargement soutiens:', error);
        return;
    }

    const count = data.length;
    nbJoueursSoutenus.textContent = count;
    joueursSoutenusValue.textContent = count;

    const recent = data.slice(0, 5);
    if (recent.length === 0) {
        recentPlayersList.innerHTML = '<p class="no-data">Aucun joueur soutenu.</p>';
    } else {
        recentPlayersList.innerHTML = recent.map(s => {
            const player = s.player || {};
            return `
                <div class="recent-item">
                    <div class="main">${player.full_name || 'Joueur inconnu'}</div>
                    <div class="date">Depuis ${new Date(s.date_debut).toLocaleDateString('fr-FR')}</div>
                    <div class="sub">Montant total: ${s.montant_total.toLocaleString('fr-FR')} FCFA</div>
                </div>
            `;
        }).join('');
    }
}

async function loadRecentMessages() {
    // Récupérer les derniers messages reçus via les conversations
    // Il faut d'abord récupérer les conversations où le parrain est participant
    const { data: conversations, error: convError } = await supabaseParrainsSpacePrive
        .from('conversations')
        .select('id')
        .or(`participant1_id.eq.${currentParrain.id},participant2_id.eq.${currentParrain.id}`);

    if (convError || !conversations || conversations.length === 0) {
        recentMessagesList.innerHTML = '<p class="no-data">Aucun message.</p>';
        return;
    }

    const convIds = conversations.map(c => c.id);

    const { data: messages, error: msgError } = await supabaseParrainsSpacePrive
        .from('messages')
        .select(`
            id,
            content,
            created_at,
            sender_id,
            profiles!sender_id (full_name, avatar_url)
        `)
        .in('conversation_id', convIds)
        .order('created_at', { ascending: false })
        .limit(5);

    if (msgError) {
        console.error('Erreur chargement messages:', msgError);
        recentMessagesList.innerHTML = '<p class="no-data">Erreur lors du chargement.</p>';
        return;
    }

    if (messages.length === 0) {
        recentMessagesList.innerHTML = '<p class="no-data">Aucun message récent.</p>';
    } else {
        recentMessagesList.innerHTML = messages.map(m => `
            <div class="recent-item">
                <div class="date">${new Date(m.created_at).toLocaleString('fr-FR')}</div>
                <div class="main">${m.profiles?.full_name || 'Inconnu'}</div>
                <div class="sub">${m.content.substring(0, 50)}...</div>
            </div>
        `).join('');
    }
}

async function loadLicenseStatus() {
    // Table `license_requests` unifiée
    const { data, error } = await supabaseParrainsSpacePrive
        .from('license_requests')
        .select('status')
        .eq('user_id', currentParrain.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Erreur chargement statut licence:', error);
        return;
    }

    let statusText = 'Non demandée';
    if (data) {
        switch (data.status) {
            case 'approved': statusText = 'Validée'; break;
            case 'rejected': statusText = 'Rejetée'; break;
            case 'president_pending': statusText = 'Validation président'; break;
            case 'admin_pending': statusText = 'En attente admin'; break;
            default: statusText = 'En cours';
        }
    }
    licenseStatus.textContent = statusText;
}

function calculateProfileCompletion() {
    // Champs à vérifier pour le profil
    const fields = [
        currentParrain.full_name,
        currentParrain.email,
        currentParrain.avatar_url,
        currentParrain.contact_info?.phone,
        currentParrain.contact_info?.country,
        currentParrain.username
    ];
    const filled = fields.filter(f => f && f !== '').length;
    const percent = Math.round((filled / fields.length) * 100);
    profileCompletion.textContent = percent;
}

function prepareChart(transactions) {
    if (!donationsChart || !transactions || transactions.length === 0) return;

    // Grouper par mois
    const months = {};
    transactions.forEach(t => {
        const date = new Date(t.created_at);
        const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
        months[key] = (months[key] || 0) + t.amount;
    });

    const sortedKeys = Object.keys(months).sort();
    const labels = sortedKeys.map(k => {
        const [y, m] = k.split('-');
        return `${m}/${y}`;
    });
    const data = sortedKeys.map(k => months[k]);

    new Chart(donationsChart, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Montant (FCFA)',
                data: data,
                borderColor: '#551B8C',
                backgroundColor: 'rgba(85,27,140,0.1)',
                tension: 0.4,
                pointBackgroundColor: '#FFCC00'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ===== UPLOAD AVATAR =====
fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file || !currentParrain) return;

    // Vérification taille (max 2 Mo)
    if (file.size > 2 * 1024 * 1024) {
        showToast('L\'image ne doit pas dépasser 2 Mo', 'warning');
        return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `avatar_${currentParrain.id}_${Date.now()}.${fileExt}`;

    showLoader(true);
    try {
        const { error: uploadError } = await supabaseParrainsSpacePrive.storage
            .from('avatars')  // Bucket unifié
            .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data } = supabaseParrainsSpacePrive.storage
            .from('avatars')
            .getPublicUrl(fileName);

        if (!data || !data.publicUrl) {
            throw new Error('Impossible de récupérer l\'URL publique');
        }

        const publicURL = data.publicUrl;

        const { error: updateError } = await supabaseParrainsSpacePrive
            .from('profiles')
            .update({ avatar_url: publicURL })
            .eq('id', currentParrain.id);

        if (updateError) throw updateError;

        currentParrain.avatar_url = publicURL;
        const avatarWithTimestamp = `${publicURL}?t=${new Date().getTime()}`;
        userAvatar.src = avatarWithTimestamp;
        profileDisplay.src = avatarWithTimestamp;

        showToast('Avatar mis à jour avec succès', 'success');
    } catch (error) {
        console.error('Erreur upload avatar:', error);
        showToast('Erreur lors de la mise à jour de l\'avatar', 'error');
    } finally {
        showLoader(false);
    }
});

// ===== INTERACTIONS UI =====
if (userMenu) {
    userMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => userDropdown.classList.remove('show'));
}

// Gestion du swipe et de la sidebar
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
const swipeThreshold = 50;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, { passive: true });

document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diffX = touchEndX - touchStartX;
    const diffY = e.changedTouches[0].screenY - touchStartY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
        if (e.cancelable) e.preventDefault();
        if (diffX > 0 && touchStartX < 50) {
            sidebar?.classList.add('active');
            sidebarOverlay?.classList.add('active');
        } else if (diffX < 0 && sidebar?.classList.contains('active')) {
            sidebar?.classList.remove('active');
            sidebarOverlay?.classList.remove('active');
        }
    }
}, { passive: false });

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        sidebar.classList.add('active');
        sidebarOverlay.classList.add('active');
    });
}
if (closeSidebar) {
    closeSidebar.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
}
if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        sidebarOverlay.classList.remove('active');
    });
}

// Déconnexion
const logout = async (e) => {
    e.preventDefault();
    if (confirm('Voulez-vous vraiment vous déconnecter ?')) {
        await supabaseParrainsSpacePrive.auth.signOut();
        window.location.href = '../index.html';
    }
};
if (logoutLink) logoutLink.addEventListener('click', logout);
if (logoutLinkSidebar) logoutLinkSidebar.addEventListener('click', logout);

// Copie de l'ID
window.copyID = () => {
    const id = parrainID.textContent.replace('ID: ', '');
    navigator.clipboard.writeText(id);
    showToast('ID copié !', 'success');
};

// ===== SÉLECTEUR DE LANGUE =====
document.getElementById('langSelect')?.addEventListener('change', (e) => {
    const lang = e.target.value;
    showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
    // Ici vous pourrez plus tard implémenter la traduction
});

document.getElementById('languageLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    showToast('Changement de langue bientôt disponible', 'info');
});

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
});
