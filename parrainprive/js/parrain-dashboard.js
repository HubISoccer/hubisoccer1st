// ===== ÉLÉMENTS SPÉCIFIQUES AU DASHBOARD =====
const dashboardName = document.getElementById('dashboardName');
const parrainFullName = document.getElementById('parrainFullName');
const parrainEmail = document.getElementById('parrainEmail');
const parrainPhone = document.getElementById('parrainPhone');
const memberSince = document.getElementById('memberSince');
const parrainID = document.getElementById('parrainID');
const profileDisplay = document.getElementById('profileDisplay');
const profileCompletion = document.getElementById('profileCompletion');
const totalDons = document.getElementById('totalDons');
const nbJoueursSoutenus = document.getElementById('nbJoueursSoutenus');
const totalDonsValue = document.getElementById('totalDonsValue');
const joueursSoutenusValue = document.getElementById('joueursSoutenusValue');
const lastDonDate = document.getElementById('lastDonDate');
const licenseStatus = document.getElementById('licenseStatus');
const recentDonationsList = document.getElementById('recentDonationsList');
const recentPlayersList = document.getElementById('recentPlayersList');
const recentMessagesList = document.getElementById('recentMessagesList');
const donationsChart = document.getElementById('donationsChart');

// ===== ATTENTE DE CHARGEMENT DE currentParrain =====
function waitForParrain(callback) {
    if (typeof currentParrain !== 'undefined' && currentParrain !== null) {
        callback();
    } else {
        setTimeout(() => waitForParrain(callback), 100);
    }
}

// ===== CHARGEMENT DES DONNÉES DU PARRAIN =====
async function loadParrainData() {
    if (!currentParrain) return;

    // Mettre à jour les infos de base
    const fullName = `${currentParrain.first_name} ${currentParrain.last_name}`;
    if (dashboardName) dashboardName.textContent = fullName;
    if (parrainFullName) parrainFullName.textContent = fullName;
    if (parrainEmail) parrainEmail.textContent = currentParrain.email;
    if (parrainPhone) parrainPhone.textContent = currentParrain.phone || 'Non renseigné';
    if (memberSince) {
        const date = new Date(currentParrain.date_adhesion);
        memberSince.textContent = date.toLocaleDateString('fr-FR');
    }
    if (parrainID) parrainID.textContent = `ID: ${currentParrain.id}`;
    if (profileDisplay && currentParrain.avatar_url) {
        profileDisplay.src = currentParrain.avatar_url;
    }

    // Charger les transactions
    await loadTransactions();
    // Charger les soutiens
    await loadSoutiens();
    // Charger les messages récents
    await loadRecentMessages();
    // Charger le statut de licence
    await loadLicenseStatus();
    // Calculer le pourcentage de complétion du profil
    calculateProfileCompletion();
}

// ===== TRANSACTIONS =====
async function loadTransactions() {
    const { data, error } = await supabaseParrainPrive
        .from('parrain_transactions')
        .select('*')
        .eq('parrain_id', currentParrain.id)
        .order('date_transaction', { ascending: false });

    if (error) {
        console.error('Erreur chargement transactions:', error);
        return;
    }

    // Calculer le total des dons
    const total = data.reduce((sum, t) => sum + t.montant, 0);
    if (totalDons) totalDons.textContent = total.toLocaleString('fr-FR');
    if (totalDonsValue) totalDonsValue.textContent = total.toLocaleString('fr-FR') + ' FCFA';

    // Dernier don
    if (data.length > 0) {
        const last = data[0];
        const lastDate = new Date(last.date_transaction).toLocaleDateString('fr-FR');
        if (lastDonDate) lastDonDate.textContent = lastDate;
    } else {
        if (lastDonDate) lastDonDate.textContent = 'Aucun';
    }

    // Afficher les 5 derniers dons
    if (recentDonationsList) {
        const recent = data.slice(0, 5);
        if (recent.length === 0) {
            recentDonationsList.innerHTML = '<p>Aucun don pour le moment.</p>';
        } else {
            let html = '';
            recent.forEach(t => {
                html += `
                    <div class="donation-item">
                        <div class="date">${new Date(t.date_transaction).toLocaleDateString('fr-FR')}</div>
                        <div class="montant">${t.montant.toLocaleString('fr-FR')} FCFA</div>
                        <div>${t.type || 'don'}</div>
                    </div>
                `;
            });
            recentDonationsList.innerHTML = html;
        }
    }

    // Préparer les données pour le graphique
    prepareChartData(data);
}

// ===== SOUTIENS (joueurs soutenus) =====
async function loadSoutiens() {
    const { data, error } = await supabaseParrainPrive
        .from('parrain_soutiens')
        .select('*, player_profiles(first_name, last_name)')
        .eq('parrain_id', currentParrain.id)
        .order('date_debut', { ascending: false });

    if (error) {
        console.error('Erreur chargement soutiens:', error);
        return;
    }

    const count = data.length;
    if (nbJoueursSoutenus) nbJoueursSoutenus.textContent = count;
    if (joueursSoutenusValue) joueursSoutenusValue.textContent = count;

    // Afficher les 5 derniers joueurs soutenus
    if (recentPlayersList) {
        const recent = data.slice(0, 5);
        if (recent.length === 0) {
            recentPlayersList.innerHTML = '<p>Aucun joueur soutenu pour le moment.</p>';
        } else {
            let html = '';
            recent.forEach(s => {
                const player = s.player_profiles;
                html += `
                    <div class="player-item">
                        <div class="player-name">${player?.first_name || ''} ${player?.last_name || ''}</div>
                        <div class="date">Depuis ${new Date(s.date_debut).toLocaleDateString('fr-FR')}</div>
                        <div>Montant total: ${s.montant_total.toLocaleString('fr-FR')} FCFA</div>
                    </div>
                `;
            });
            recentPlayersList.innerHTML = html;
        }
    }
}

// ===== MESSAGES RÉCENTS =====
async function loadRecentMessages() {
    const { data, error } = await supabaseParrainPrive
        .from('parrain_messages')
        .select('*')
        .eq('receiver_id', currentParrain.id)
        .eq('receiver_type', 'parrain')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error('Erreur chargement messages:', error);
        return;
    }

    if (recentMessagesList) {
        if (data.length === 0) {
            recentMessagesList.innerHTML = '<p>Aucun message récent.</p>';
        } else {
            let html = '';
            data.forEach(m => {
                html += `
                    <div class="message-item">
                        <div class="date">${new Date(m.created_at).toLocaleString('fr-FR')}</div>
                        <div class="message-preview">${m.content.substring(0, 50)}...</div>
                    </div>
                `;
            });
            recentMessagesList.innerHTML = html;
        }
    }
}

// ===== STATUT DE LICENCE =====
async function loadLicenseStatus() {
    const { data, error } = await supabaseParrainPrive
        .from('parrain_license_requests')
        .select('status')
        .eq('parrain_id', currentParrain.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error('Erreur chargement licence:', error);
        return;
    }

    let statusText = 'Non demandée';
    if (data) {
        switch (data.status) {
            case 'approved': statusText = 'Validée'; break;
            case 'rejected': statusText = 'Rejetée'; break;
            case 'president_pending': statusText = 'Validation président en cours'; break;
            case 'admin_pending': statusText = 'En attente admin'; break;
            default: statusText = 'En cours';
        }
    }
    if (licenseStatus) licenseStatus.textContent = statusText;
}

// ===== POURCENTAGE DE COMPLÉTION DU PROFIL =====
function calculateProfileCompletion() {
    let total = 0;
    let filled = 0;

    const fields = [
        currentParrain.first_name,
        currentParrain.last_name,
        currentParrain.email,
        currentParrain.phone,
        currentParrain.avatar_url
    ];

    fields.forEach(f => { if (f && f !== '') filled++; });
    total = fields.length;

    const percent = Math.round((filled / total) * 100);
    if (profileCompletion) profileCompletion.textContent = percent;
}

// ===== GRAPHIQUE D'ÉVOLUTION DES DONS =====
function prepareChartData(transactions) {
    if (!donationsChart) return;

    // Regrouper par mois
    const months = {};
    transactions.forEach(t => {
        const date = new Date(t.date_transaction);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        months[monthKey] = (months[monthKey] || 0) + t.montant;
    });

    // Trier par date
    const sortedMonths = Object.keys(months).sort();
    const labels = sortedMonths.map(m => {
        const [year, month] = m.split('-');
        return `${month}/${year}`;
    });
    const data = sortedMonths.map(m => months[m]);

    new Chart(donationsChart, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Montant des dons (FCFA)',
                data: data,
                borderColor: '#551B8C',
                backgroundColor: 'rgba(85,27,140,0.1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

// ===== INITIALISATION =====
waitForParrain(() => {
    loadParrainData();
});