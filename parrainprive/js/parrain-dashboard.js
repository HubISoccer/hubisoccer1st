// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

// Profil
const profileDisplay = document.getElementById('profileDisplay');
const fileInput = document.getElementById('fileInput');
const dashboardName = document.getElementById('dashboardName');
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

// ===== GESTION DE LA SESSION =====
async function checkSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
            window.location.href = 'auth/login.html';
            return null;
        }
        const { data: profile, error: profileError } = await supabase
            .from('parrain_profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();
        if (profileError || !profile) {
            window.location.href = 'auth/login.html';
            return null;
        }
        currentParrain = profile;
        updateUserUI();
        loadParrainData();
        return profile;
    } catch (err) {
        console.error(err);
        window.location.href = 'auth/login.html';
    }
}

function updateUserUI() {
    if (currentParrain) {
        const fullName = `${currentParrain.first_name} ${currentParrain.last_name}`;
        userNameSpan.textContent = fullName;
        if (currentParrain.avatar_url) {
            userAvatar.src = currentParrain.avatar_url;
            profileDisplay.src = currentParrain.avatar_url;
        }
        dashboardName.textContent = fullName;
        parrainFullName.textContent = fullName;
        parrainEmail.textContent = currentParrain.email;
        parrainPhone.textContent = currentParrain.phone || 'Non renseigné';
        if (currentParrain.date_adhesion) {
            memberSince.textContent = new Date(currentParrain.date_adhesion).toLocaleDateString('fr-FR');
        }
        parrainID.textContent = `ID: ${currentParrain.id}`;
    }
}

// ===== CHARGEMENT DES DONNÉES =====
async function loadParrainData() {
    if (!currentParrain) return;
    await Promise.all([
        loadTransactions(),
        loadSoutiens(),
        loadRecentMessages(),
        loadLicenseStatus()
    ]);
    calculateProfileCompletion();
}

async function loadTransactions() {
    const { data, error } = await supabase
        .from('parrain_transactions')
        .select('*')
        .eq('parrain_id', currentParrain.id)
        .order('date_transaction', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    const total = data.reduce((sum, t) => sum + t.montant, 0);
    totalDons.textContent = total.toLocaleString('fr-FR');
    totalDonsValue.textContent = total.toLocaleString('fr-FR') + ' FCFA';

    if (data.length > 0) {
        const last = data[0];
        lastDonDate.textContent = new Date(last.date_transaction).toLocaleDateString('fr-FR');
    } else {
        lastDonDate.textContent = 'Aucun';
    }

    // Afficher les 5 derniers
    const recent = data.slice(0, 5);
    if (recent.length === 0) {
        recentDonationsList.innerHTML = '<p class="no-data">Aucun don pour le moment.</p>';
    } else {
        recentDonationsList.innerHTML = recent.map(t => `
            <div class="recent-item">
                <div class="date">${new Date(t.date_transaction).toLocaleDateString('fr-FR')}</div>
                <div class="main">${t.montant.toLocaleString('fr-FR')} FCFA</div>
                <div class="sub">${t.type || 'don'}</div>
            </div>
        `).join('');
    }

    prepareChart(data);
}

async function loadSoutiens() {
    const { data, error } = await supabase
        .from('parrain_soutiens')
        .select('*, player_profiles(first_name, last_name)')
        .eq('parrain_id', currentParrain.id)
        .order('date_debut', { ascending: false });

    if (error) {
        console.error(error);
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
            const player = s.player_profiles || {};
            return `
                <div class="recent-item">
                    <div class="main">${player.first_name || ''} ${player.last_name || ''}</div>
                    <div class="date">Depuis ${new Date(s.date_debut).toLocaleDateString('fr-FR')}</div>
                    <div class="sub">Montant total: ${s.montant_total.toLocaleString('fr-FR')} FCFA</div>
                </div>
            `;
        }).join('');
    }
}

async function loadRecentMessages() {
    const { data, error } = await supabase
        .from('parrain_messages')
        .select('*')
        .eq('receiver_id', currentParrain.id)
        .eq('receiver_type', 'parrain')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error(error);
        return;
    }

    if (data.length === 0) {
        recentMessagesList.innerHTML = '<p class="no-data">Aucun message.</p>';
    } else {
        recentMessagesList.innerHTML = data.map(m => `
            <div class="recent-item">
                <div class="date">${new Date(m.created_at).toLocaleString('fr-FR')}</div>
                <div class="main">${m.content.substring(0, 50)}...</div>
            </div>
        `).join('');
    }
}

async function loadLicenseStatus() {
    const { data, error } = await supabase
        .from('parrain_license_requests')
        .select('status')
        .eq('parrain_id', currentParrain.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error(error);
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
    const fields = [
        currentParrain.first_name,
        currentParrain.last_name,
        currentParrain.email,
        currentParrain.phone,
        currentParrain.avatar_url
    ];
    const filled = fields.filter(f => f && f !== '').length;
    const percent = Math.round((filled / fields.length) * 100);
    profileCompletion.textContent = percent;
}

function prepareChart(transactions) {
    if (!donationsChart) return;

    // Grouper par mois
    const months = {};
    transactions.forEach(t => {
        const date = new Date(t.date_transaction);
        const key = `${date.getFullYear()}-${date.getMonth()+1}`;
        months[key] = (months[key] || 0) + t.montant;
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

    const fileExt = file.name.split('.').pop();
    const fileName = `avatar_${currentParrain.id}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
        .from('parrain-avatars')
        .upload(fileName, file);

    if (uploadError) {
        alert('Erreur upload: ' + uploadError.message);
        return;
    }

    const { publicURL } = supabase.storage
        .from('parrain-avatars')
        .getPublicUrl(fileName);

    const { error: updateError } = await supabase
        .from('parrain_profiles')
        .update({ avatar_url: publicURL })
        .eq('id', currentParrain.id);

    if (!updateError) {
        currentParrain.avatar_url = publicURL;
        userAvatar.src = publicURL;
        profileDisplay.src = publicURL;
        alert('Avatar mis à jour !');
    } else {
        alert('Erreur mise à jour: ' + updateError.message);
    }
});

// ===== INTERACTIONS UI =====
// Menu utilisateur
if (userMenu) {
    userMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => userDropdown.classList.remove('show'));
}

// Sidebar
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
    if (confirm('Déconnexion ?')) {
        await supabase.auth.signOut();
        window.location.href = 'auth/login.html';
    }
};
if (logoutLink) logoutLink.addEventListener('click', logout);
if (logoutLinkSidebar) logoutLinkSidebar.addEventListener('click', logout);

// Copie ID
window.copyID = () => {
    const id = parrainID.textContent.replace('ID: ', '');
    navigator.clipboard.writeText(id);
    alert('ID copié !');
};

// ===== INITIALISATION =====
checkSession();