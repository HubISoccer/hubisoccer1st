const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayersSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let wallet = null;
let transactions = [];
let followersCount = 0;
let bonusTiers = [];
let currentCardAction = null;

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

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

function showLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';
}
function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

async function checkSession() {
    showLoader();
    try {
        const { data: { session }, error } = await supabasePlayersSpacePrive.auth.getSession();
        if (error || !session) {
            window.location.href = '../auth/login.html';
            return null;
        }
        currentUser = session.user;
        return currentUser;
    } catch (err) {
        console.error(err);
        window.location.href = '../auth/login.html';
        return null;
    } finally {
        hideLoader();
    }
}

async function loadProfile() {
    if (!currentUser) return;
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', currentUser.id)
            .single();
        if (error) throw error;
        currentProfile = data;
        document.getElementById('userName').textContent = currentProfile.full_name || 'Joueur';
        updateAvatarDisplay();
        document.getElementById('cardHolder').textContent = currentProfile.full_name || 'Titulaire';
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement profil', 'error');
    } finally {
        hideLoader();
    }
}

function updateAvatarDisplay() {
    const userAvatar = document.getElementById('userAvatar');
    const userInitials = document.getElementById('userAvatarInitials');
    if (currentProfile?.avatar_url) {
        userAvatar.src = currentProfile.avatar_url;
        userAvatar.style.display = 'block';
        if (userInitials) userInitials.style.display = 'none';
    } else {
        const initials = (currentProfile?.full_name || 'J').charAt(0).toUpperCase();
        if (userInitials) {
            userInitials.textContent = initials;
            userInitials.style.display = 'flex';
        }
        userAvatar.style.display = 'none';
    }
}

// ========== GESTION DE LA CARTE ==========
async function loadOrCreateWallet() {
    if (!currentProfile) return null;
    showLoader();
    try {
        const { data: wallets, error: selectError } = await supabasePlayersSpacePrive
            .from('player_wallets')
            .select('*')
            .eq('player_id', currentProfile.id)
            .order('created_at', { ascending: false })
            .limit(1);
        if (selectError) throw selectError;

        if (wallets && wallets.length > 0) {
            wallet = wallets[0];
            await ensureCardFields(wallet);
            displayCard();
        } else {
            // Pas de portefeuille, afficher le bouton de création
            document.getElementById('createCardSection').style.display = 'block';
            document.getElementById('hubisCardContainer').style.display = 'none';
        }
        updateWalletUI();
        return wallet;
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement portefeuille', 'error');
        return null;
    } finally {
        hideLoader();
    }
}

async function ensureCardFields(w) {
    // Si la carte n'a pas encore de numéro, générer les informations
    if (!w.card_number) {
        const cardNumber = generateCardNumber();
        const cardType = generateCardType();
        const expiry = generateExpiry();
        const withdrawalCode = generateRandomDigits(5);
        const emarketCode = generateRandomDigits(4);
        const { error } = await supabasePlayersSpacePrive
            .from('player_wallets')
            .update({
                card_number: cardNumber,
                card_type: cardType,
                card_expiry: expiry,
                withdrawal_code: withdrawalCode,
                emarket_code: emarketCode,
                card_status: 'active'
            })
            .eq('id', w.id);
        if (error) throw error;
        Object.assign(w, { card_number: cardNumber, card_type: cardType, card_expiry: expiry, withdrawal_code: withdrawalCode, emarket_code: emarketCode, card_status: 'active' });
    }
}

function generateCardNumber() {
    let num = '';
    for (let i = 0; i < 20; i++) num += Math.floor(Math.random() * 10);
    return num;
}
function generateCardType() {
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase(); // 5 caractères alphanum
    const timestampPart = Math.floor(Date.now() / 1000).toString().slice(-5);
    return `${randomPart} Role HUBIS ${timestampPart}`;
}
function generateExpiry() {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${month}/${year}`;
}
function generateRandomDigits(length) {
    return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
}

function displayCard() {
    document.getElementById('createCardSection').style.display = 'none';
    const container = document.getElementById('hubisCardContainer');
    container.style.display = 'block';
    const cardNumberElem = document.getElementById('cardNumber');
    const masked = wallet.card_number.replace(/(.{4})/g, '$1 ').trim();
    cardNumberElem.textContent = masked;
    document.getElementById('cardType').textContent = wallet.card_type;
    document.getElementById('cardExpiry').textContent = wallet.card_expiry;
    document.getElementById('cardBalance').textContent = `${wallet.balance || 0} FCFA`;
    document.getElementById('cardHolder').textContent = currentProfile.full_name || 'Titulaire';
    const wCode = wallet.withdrawal_code ? `Code retrait: ${wallet.withdrawal_code}` : 'Code retrait: •••••';
    const eCode = wallet.emarket_code ? `Code e‑market: ${wallet.emarket_code}` : 'Code e‑market: ••••';
    document.getElementById('withdrawalCode').textContent = wCode;
    document.getElementById('emarketCode').textContent = eCode;
    updateCardButtonsState();
}

function updateCardButtonsState() {
    const isActive = wallet.card_status === 'active';
    const blockBtn = document.getElementById('blockCardBtn');
    const deleteBtn = document.getElementById('deleteCardBtn');
    blockBtn.textContent = isActive ? 'Bloquer' : 'Débloquer';
    // Le bouton supprimer reste actif même si bloqué, mais l'action sera différente
}

async function createCard() {
    if (wallet) {
        showToast('Carte déjà existante', 'warning');
        return;
    }
    showLoader();
    try {
        // Créer un nouveau portefeuille avec les données de carte
        const cardNumber = generateCardNumber();
        const cardType = generateCardType();
        const expiry = generateExpiry();
        const withdrawalCode = generateRandomDigits(5);
        const emarketCode = generateRandomDigits(4);
        const { data: newWallet, error: insertError } = await supabasePlayersSpacePrive
            .from('player_wallets')
            .insert([{
                player_id: currentProfile.id,
                balance: 0,
                balance_pending: 0,
                bonus_inscription: 0,
                account_number: `HUB${Date.now()}`,
                card_number: cardNumber,
                card_type: cardType,
                card_expiry: expiry,
                withdrawal_code: withdrawalCode,
                emarket_code: emarketCode,
                card_status: 'active'
            }])
            .select()
            .single();
        if (insertError) throw insertError;
        wallet = newWallet;
        displayCard();
        showToast('Carte créée avec succès !', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la création de la carte', 'error');
    } finally {
        hideLoader();
    }
}

async function cardAction(action) {
    if (!wallet) return;
    if (action === 'reload') {
        openDepositModal();
        return;
    }
    // Pour bloquer, supprimer, on demande le code de retrait
    currentCardAction = action;
    document.getElementById('cardActionTitle').innerText = action === 'block' ? 'Bloquer la carte' : 'Supprimer la carte';
    document.getElementById('cardActionModal').classList.add('active');
}

async function confirmCardAction() {
    const code = document.getElementById('cardActionCode').value;
    if (!code || code.length !== 5) {
        showToast('Code de retrait invalide', 'warning');
        return;
    }
    if (code !== wallet.withdrawal_code) {
        showToast('Code incorrect', 'error');
        return;
    }
    closeCardActionModal();
    showLoader();
    try {
        if (currentCardAction === 'block') {
            const newStatus = wallet.card_status === 'active' ? 'blocked' : 'active';
            const { error } = await supabasePlayersSpacePrive
                .from('player_wallets')
                .update({ card_status: newStatus })
                .eq('id', wallet.id);
            if (error) throw error;
            wallet.card_status = newStatus;
            updateCardButtonsState();
            showToast(`Carte ${newStatus === 'active' ? 'débloquée' : 'bloquée'}`, 'success');
            // Notifier l'admin (on peut insérer une notification)
            await supabasePlayersSpacePrive.from('notifications').insert([{
                user_id: currentProfile.id,
                type: 'card_action',
                content: `Carte ${newStatus === 'active' ? 'débloquée' : 'bloquée'} par l'utilisateur`,
                read: false,
                created_at: new Date()
            }]);
        } else if (currentCardAction === 'delete') {
            const { error } = await supabasePlayersSpacePrive
                .from('player_wallets')
                .update({ card_status: 'deleted' })
                .eq('id', wallet.id);
            if (error) throw error;
            wallet.card_status = 'deleted';
            showToast('Carte supprimée. Contactez l\'administration pour en créer une nouvelle.', 'info');
            // Cacher la carte et afficher le bouton de création
            document.getElementById('hubisCardContainer').style.display = 'none';
            document.getElementById('createCardSection').style.display = 'block';
            await supabasePlayersSpacePrive.from('notifications').insert([{
                user_id: currentProfile.id,
                type: 'card_deleted',
                content: `Carte supprimée par l'utilisateur`,
                read: false,
                created_at: new Date()
            }]);
        }
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de l\'action', 'error');
    } finally {
        hideLoader();
        currentCardAction = null;
        document.getElementById('cardActionCode').value = '';
    }
}

function flipCard() {
    const recto = document.getElementById('cardRecto');
    const verso = document.getElementById('cardVerso');
    if (recto.style.display === 'none') {
        recto.style.display = 'block';
        verso.style.display = 'none';
        document.getElementById('flipCardBtn').textContent = 'Visualiser le recto';
    } else {
        recto.style.display = 'none';
        verso.style.display = 'block';
        document.getElementById('flipCardBtn').textContent = 'Visualiser le verso';
    }
}

// ========== TRANSACTIONS ==========
async function loadTransactions() {
    if (!currentProfile) return;
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('player_transactions')
            .select('*')
            .eq('player_id', currentProfile.id)
            .order('created_at', { ascending: false })
            .limit(20);
        if (error) throw error;
        transactions = data || [];
        renderTransactions();
        updateTotals();
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement transactions', 'error');
    } finally {
        hideLoader();
    }
}

function updateTotals() {
    let totalEarned = 0;
    let totalSpent = 0;
    transactions.forEach(t => {
        if (t.type === 'deposit' || t.type === 'bonus') {
            totalEarned += t.amount;
        } else if (t.type === 'withdraw' || t.type === 'purchase') {
            totalSpent += t.amount;
        }
    });
    document.getElementById('totalEarned').textContent = `${totalEarned} FCFA`;
    document.getElementById('totalSpent').textContent = `${totalSpent} FCFA`;
}

function renderTransactions() {
    const list = document.getElementById('transactionsList');
    if (!list) return;
    if (!transactions.length) {
        list.innerHTML = '<p class="empty-message">Aucune transaction.</p>';
        return;
    }
    list.innerHTML = transactions.map(t => {
        const date = new Date(t.created_at).toLocaleString('fr-FR');
        const sign = (t.type === 'deposit' || t.type === 'bonus') ? '+' : '-';
        const amountClass = (t.type === 'deposit' || t.type === 'bonus') ? 'positive' : 'negative';
        const icon = t.type === 'deposit' ? 'fa-arrow-down' : (t.type === 'withdraw' ? 'fa-arrow-up' : 'fa-gift');
        const statusText = {
            pending: 'En attente',
            approved: 'Approuvé',
            rejected: 'Rejeté'
        }[t.status] || t.status;

        return `
            <div class="transaction-item ${t.type}">
                <div class="transaction-icon"><i class="fas ${icon}"></i></div>
                <div class="transaction-details">
                    <div class="transaction-title">${escapeHtml(t.description || t.type)}</div>
                    <div class="transaction-desc">${escapeHtml(t.reference || '')} - ${statusText}</div>
                </div>
                <div class="transaction-amount ${amountClass}">${sign}${t.amount} FCFA</div>
                <div class="transaction-date">${date}</div>
                <button class="transaction-pdf-btn" data-id="${t.id}" title="Télécharger le reçu PDF"><i class="fas fa-file-pdf"></i></button>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.transaction-pdf-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            const transaction = transactions.find(t => t.id === id);
            if (transaction) downloadTransactionPDF(transaction);
        });
    });
}

async function downloadTransactionPDF(transaction) {
    // Préparer les données
    const statusColor = {
        pending: '#ffc107',
        approved: '#28a745',
        rejected: '#dc3545'
    }[transaction.status] || '#6c757d';
    const statusTextFr = {
        pending: 'EN ATTENTE',
        approved: 'APPROUVÉ',
        rejected: 'REJETÉ'
    }[transaction.status] || transaction.status;

    // Générer un QR code (externe ou avec une lib)
    const verifyUrl = `https://hubisoccer.github.io/hubisoccer1st/verify-transaction.html?id=${transaction.id}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verifyUrl)}`;

    // Créer le contenu HTML du PDF
    const element = document.createElement('div');
    element.style.fontFamily = 'Poppins, sans-serif';
    element.style.padding = '20px';
    element.style.position = 'relative';
    element.style.backgroundColor = '#f8f0ff'; // violet clair
    element.style.color = '#1a1a1a';
    // Filigrane en fond
    element.style.backgroundImage = 'repeating-linear-gradient(45deg, rgba(85,27,140,0.05) 0px, rgba(85,27,140,0.05) 2px, transparent 2px, transparent 8px)';
    element.innerHTML = `
        <div style="position: relative; z-index: 2;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #551B8C; padding-bottom: 10px; margin-bottom: 20px;">
                <div>
                    <img src="img/logo-navbar.png" style="height: 50px;" alt="HubISoccer">
                    <div><strong>The Hub of Inspiration of Soccer</strong></div>
                    <div style="font-size: 0.8rem;">RCCM : RB/ABC/24 A 111814 | IFU : 0201910800236</div>
                    <div style="font-size: 0.8rem;">Siège social : Aitchedji, Abomey-Calavi, Bénin</div>
                    <div style="font-size: 0.8rem;">Contact : +229 01 97 20 81 88 | hubisoccer@gmail.com</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 1.2rem; font-weight: bold;">JUSTIFICATIF D'OPÉRATION NUMÉRIQUE</div>
                    <div>Réf : ${transaction.reference}</div>
                    <div>Date : ${new Date(transaction.created_at).toLocaleString('fr-FR')}</div>
                </div>
            </div>
            <div style="margin-bottom: 20px;">
                <strong>Bénéficiaire :</strong> ${currentProfile.full_name}<br>
                <strong>Rôle :</strong> Joueur (FT)<br>
                <strong>ID HubISoccer :</strong> ${currentProfile.id}
            </div>
            <div style="background: ${statusColor}; padding: 8px; text-align: center; font-weight: bold; color: white; margin-bottom: 20px;">
                STATUT : ${statusTextFr}
            </div>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Nature</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${transaction.type === 'deposit' ? 'Dépôt' : transaction.type === 'withdraw' ? 'Retrait' : 'Bonus'}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Montant</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${transaction.amount} FCFA</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Mode de règlement</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${transaction.description?.split(' ')[2] || 'Solde interne'}</td></tr>
                <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Libellé détaillé</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${transaction.description || ''}</td></tr>
            </table>
            <div style="font-size: 0.8rem; color: #6c757d; margin-bottom: 20px;">
                <p>Le présent document est généré de manière automatisée par le système HubISoccer et constitue une preuve d'opération numérique conformément aux dispositions légales sur le commerce électronique au Bénin.</p>
                <p>Cette transaction est enregistrée dans le grand livre numérique de l'entité The Hub of Inspiration of Soccer et peut faire l'objet d'une vérification de conformité auprès de nos services financiers.</p>
                <p>Toute falsification de ce document est passible de poursuites judiciaires.</p>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                <div><img src="${qrCodeUrl}" style="width: 100px; height: 100px;" alt="QR Code"></div>
                <div style="text-align: right;">
                    <div>Signature du Responsable Financier</div>
                    <div style="margin-top: 20px;">____________________</div>
                    <div>Cachet numérique</div>
                </div>
            </div>
            <div style="margin-top: 30px; text-align: center; font-size: 0.7rem; color: #aaa;">
                Approuvé pour valoir ce que de droit
            </div>
        </div>
    `;
    // Filigrane en pseudo-élément (ajouté via style)
    element.style.position = 'relative';
    const watermark = document.createElement('div');
    watermark.style.position = 'absolute';
    watermark.style.top = '0';
    watermark.style.left = '0';
    watermark.style.width = '100%';
    watermark.style.height = '100%';
    watermark.style.pointerEvents = 'none';
    watermark.style.zIndex = '1';
    watermark.style.background = 'repeating-linear-gradient(45deg, rgba(85,27,140,0.1) 0px, rgba(85,27,140,0.1) 3px, transparent 3px, transparent 12px)';
    watermark.innerHTML = '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 48px; color: rgba(85,27,140,0.2); white-space: nowrap;">CONFIDENTIEL HUBISOCCER</div>';
    element.appendChild(watermark);
    document.body.appendChild(element);
    const opt = {
        margin: 0.5,
        filename: `transaction_${transaction.reference}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save().then(() => {
        document.body.removeChild(element);
    }).catch(err => {
        console.error(err);
        showToast('Erreur génération PDF', 'error');
        document.body.removeChild(element);
    });
}

async function exportCSV() {
    if (!transactions.length) {
        showToast('Aucune transaction à exporter', 'warning');
        return;
    }
    const headers = ['Référence', 'Date', 'Type', 'Montant', 'Statut', 'Description', 'Notes admin'];
    const rows = transactions.map(t => [
        t.reference,
        new Date(t.created_at).toLocaleString('fr-FR'),
        t.type,
        t.amount,
        t.status,
        t.description,
        t.admin_notes || ''
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `releve_${currentProfile.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// ========== BONUS ABONNÉS ==========
async function loadFollowersCount() {
    if (!currentProfile) return;
    try {
        const { count, error } = await supabasePlayersSpacePrive
            .from('feed_follows')
            .select('*', { count: 'exact', head: true })
            .eq('followed_id', currentProfile.id);
        if (error) throw error;
        followersCount = count || 0;
        await loadBonusTiers();
    } catch (err) {
        console.error(err);
    }
}

async function loadBonusTiers() {
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('bonus_tiers')
            .select('*')
            .order('min_followers', { ascending: true });
        if (error) throw error;
        bonusTiers = data || [];
        updateBonusUI();
    } catch (err) {
        console.error(err);
    }
}

async function updateBonusUI() {
    if (!bonusTiers.length) return;
    let eligibleTier = null;
    for (let i = bonusTiers.length - 1; i >= 0; i--) {
        const tier = bonusTiers[i];
        if (followersCount >= tier.min_followers && (tier.max_followers === null || followersCount <= tier.max_followers)) {
            const { data: claim, error } = await supabasePlayersSpacePrive
                .from('player_bonus_claims')
                .select('id')
                .eq('player_id', currentProfile.id)
                .eq('tier_id', tier.id)
                .maybeSingle();
            if (error) console.error(error);
            if (!claim) {
                eligibleTier = tier;
                break;
            }
        }
    }
    const bonusMsg = document.getElementById('bonusMessage');
    const withdrawBtn = document.getElementById('withdrawBonusBtn');
    if (eligibleTier) {
        bonusMsg.textContent = `${eligibleTier.amount} FCFA (${followersCount} abonnés) – Cliquez pour retirer`;
        withdrawBtn.disabled = false;
        withdrawBtn.dataset.tierId = eligibleTier.id;
        withdrawBtn.dataset.amount = eligibleTier.amount;
    } else {
        const nextTier = bonusTiers.find(t => followersCount < t.min_followers);
        if (nextTier) {
            bonusMsg.textContent = `Prochain bonus à ${nextTier.min_followers} abonnés : ${nextTier.amount} FCFA (actuellement ${followersCount})`;
        } else {
            bonusMsg.textContent = `Félicitations ! Vous avez atteint tous les paliers.`;
        }
        withdrawBtn.disabled = true;
        withdrawBtn.dataset.tierId = '';
        withdrawBtn.dataset.amount = '';
    }
}

async function claimBonus(tierId, amount) {
    if (!tierId) return;
    showLoader();
    try {
        const { error: transError } = await supabasePlayersSpacePrive
            .from('player_transactions')
            .insert([{
                player_id: currentProfile.id,
                type: 'bonus',
                amount: amount,
                status: 'pending',
                description: `Bonus pour ${followersCount} abonnés`,
                reference: `BONUS-${Date.now()}-${currentProfile.id}`,
                balance_before: wallet.balance,
                balance_after: wallet.balance + amount
            }]);
        if (transError) throw transError;

        const { error: claimError } = await supabasePlayersSpacePrive
            .from('player_bonus_claims')
            .insert([{
                player_id: currentProfile.id,
                tier_id: tierId
            }]);
        if (claimError) throw claimError;

        showToast('Demande de bonus envoyée. En attente de validation.', 'success');
        await loadTransactions();
        updateBonusUI();
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la demande de bonus', 'error');
    } finally {
        hideLoader();
    }
}

// ========== DÉPÔT / RETRAIT ==========
async function uploadProof(file, type) {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentProfile.id}_${type}_${Date.now()}.${fileExt}`;
    const filePath = `proofs/${fileName}`;
    const { error: uploadError } = await supabasePlayersSpacePrive.storage
        .from('documents')
        .upload(filePath, file);
    if (uploadError) {
        console.error(uploadError);
        return null;
    }
    const { data: urlData } = supabasePlayersSpacePrive.storage
        .from('documents')
        .getPublicUrl(filePath);
    return urlData.publicUrl;
}

document.getElementById('depositForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseInt(document.getElementById('depositAmount').value);
    const method = document.getElementById('depositMethod').value;
    const proofFile = document.getElementById('depositProof').files[0];
    if (amount < 100) {
        showToast('Le montant minimum est de 100 FCFA', 'warning');
        return;
    }
    showLoader();
    const submitBtn = e.target.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';
    try {
        let proofUrl = null;
        if (proofFile) {
            proofUrl = await uploadProof(proofFile, 'deposit');
            if (!proofUrl) throw new Error('Échec upload justificatif');
        }
        const { error } = await supabasePlayersSpacePrive
            .from('player_transactions')
            .insert([{
                player_id: currentProfile.id,
                type: 'deposit',
                amount: amount,
                status: 'pending',
                description: `Dépôt via ${method}`,
                reference: `DEP-${Date.now()}-${currentProfile.id}`,
                proof_url: proofUrl,
                balance_before: wallet.balance,
                balance_after: wallet.balance + amount
            }]);
        if (error) throw error;
        showToast('Demande de dépôt envoyée, en attente de confirmation.', 'success');
        closeDepositModal();
        document.getElementById('depositForm').reset();
        await loadTransactions();
    } catch (err) {
        console.error(err);
        showToast('Erreur : ' + err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        hideLoader();
    }
});

document.getElementById('withdrawForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = parseInt(document.getElementById('withdrawAmount').value);
    const method = document.getElementById('withdrawMethod').value;
    const recipient = document.getElementById('withdrawRecipient').value.trim();
    const proofFile = document.getElementById('withdrawProof').files[0];
    if (amount < 100) {
        showToast('Le montant minimum est de 100 FCFA', 'warning');
        return;
    }
    if (!recipient) {
        showToast('Veuillez indiquer le bénéficiaire', 'warning');
        return;
    }
    if (!wallet || amount > wallet.balance) {
        showToast('Solde insuffisant', 'warning');
        return;
    }
    showLoader();
    const submitBtn = e.target.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';
    try {
        let proofUrl = null;
        if (proofFile) {
            proofUrl = await uploadProof(proofFile, 'withdraw');
            if (!proofUrl) throw new Error('Échec upload justificatif');
        }
        const { error } = await supabasePlayersSpacePrive
            .from('player_transactions')
            .insert([{
                player_id: currentProfile.id,
                type: 'withdraw',
                amount: amount,
                status: 'pending',
                description: `Retrait vers ${method} (${recipient})`,
                reference: `WDR-${Date.now()}-${currentProfile.id}`,
                proof_url: proofUrl,
                balance_before: wallet.balance,
                balance_after: wallet.balance - amount
            }]);
        if (error) throw error;
        showToast('Demande de retrait envoyée, en attente de validation.', 'success');
        closeWithdrawModal();
        document.getElementById('withdrawForm').reset();
        await loadTransactions();
    } catch (err) {
        console.error(err);
        showToast('Erreur : ' + err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
        hideLoader();
    }
});

document.getElementById('withdrawBonusBtn').addEventListener('click', () => {
    const btn = document.getElementById('withdrawBonusBtn');
    const tierId = btn.dataset.tierId;
    const amount = parseInt(btn.dataset.amount);
    if (tierId && amount) {
        claimBonus(tierId, amount);
    } else {
        showToast('Aucun bonus disponible actuellement', 'warning');
    }
});

document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
document.getElementById('viewAllTransactionsBtn').addEventListener('click', () => {
    window.location.href = 'transactions-detail.html';
});
document.getElementById('viewAllTransactionsBtnBottom').addEventListener('click', () => {
    window.location.href = 'transactions-detail.html';
});

// ========== UI ==========
function openDepositModal() { document.getElementById('depositModal').style.display = 'block'; }
function closeDepositModal() { document.getElementById('depositModal').style.display = 'none'; }
function openWithdrawModal() { document.getElementById('withdrawModal').style.display = 'block'; }
function closeWithdrawModal() { document.getElementById('withdrawModal').style.display = 'none'; }
function closeCardActionModal() { document.getElementById('cardActionModal').classList.remove('active'); document.getElementById('cardActionCode').value = ''; currentCardAction = null; }

function initUserMenu() {
    const userMenu = document.getElementById('userMenu');
    const dropdown = document.getElementById('userDropdown');
    if (userMenu && dropdown) {
        userMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
        });
        document.addEventListener('click', () => dropdown.classList.remove('show'));
    }
}

function addMenuHandle() {
    if (document.getElementById('menuHandle')) return;
    const handle = document.createElement('div');
    handle.id = 'menuHandle';
    handle.className = 'menu-handle';
    handle.setAttribute('aria-label', 'Ouvrir le menu');
    handle.innerHTML = '<span></span>';
    document.body.appendChild(handle);
}

function initSidebar() {
    const menuBtn = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const closeBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuHandle = document.getElementById('menuHandle');

    function openSidebar() {
        sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
    }
    function closeSidebarFunc() {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }

    if (menuBtn) menuBtn.addEventListener('click', openSidebar);
    if (menuHandle) menuHandle.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebarFunc);
    if (overlay) overlay.addEventListener('click', closeSidebarFunc);

    let touchStartX = 0, touchStartY = 0;
    const swipeThreshold = 50;
    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
        const diffX = e.changedTouches[0].screenX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > swipeThreshold) {
            if (e.cancelable) e.preventDefault();
            if (diffX > 0 && touchStartX < 50) openSidebar();
            else if (diffX < 0) closeSidebarFunc();
        }
    }, { passive: false });
}

function initLogout() {
    document.querySelectorAll('#logoutLink, #logoutLinkSidebar').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            supabasePlayersSpacePrive.auth.signOut().then(() => {
                window.location.href = '../index.html';
            });
        });
    });
}

function updateWalletUI() {
    if (!wallet) return;
    document.getElementById('walletBalance').textContent = `${wallet.balance || 0} FCFA`;
    document.getElementById('pendingBalance').textContent = `${wallet.balance_pending || 0} FCFA`;
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation revenue');
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    if (!currentProfile) return;
    await loadOrCreateWallet();
    if (wallet) {
        await loadTransactions();
    }
    await loadFollowersCount();

    document.getElementById('depositBtn').addEventListener('click', openDepositModal);
    document.getElementById('withdrawBtn').addEventListener('click', openWithdrawModal);
    document.getElementById('createCardBtn').addEventListener('click', createCard);
    document.getElementById('reloadCardBtn').addEventListener('click', () => cardAction('reload'));
    document.getElementById('blockCardBtn').addEventListener('click', () => cardAction('block'));
    document.getElementById('deleteCardBtn').addEventListener('click', () => cardAction('delete'));
    document.getElementById('flipCardBtn').addEventListener('click', flipCard);
    document.getElementById('confirmCardActionBtn').addEventListener('click', confirmCardAction);
    window.closeDepositModal = closeDepositModal;
    window.closeWithdrawModal = closeWithdrawModal;
    window.closeCardActionModal = closeCardActionModal;

    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();

    document.getElementById('langSelect')?.addEventListener('change', (e) => {
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
    });
    document.getElementById('languageLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });
    console.log('✅ Initialisation terminée');
});
