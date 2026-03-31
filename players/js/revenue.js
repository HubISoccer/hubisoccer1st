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

// ========== GESTION DU COMPTE PRINCIPAL ET DE LA CARTE ==========
function generateAccountNumber() {
    return 'HUB' + Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
}

function formatExpiry(dateStr) {
    if (!dateStr) return '••/••';
    const d = new Date(dateStr);
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString().slice(-2);
    return `${month}/${year}`;
}

function generateExpiry() {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return `${year}-${month.toString().padStart(2, '0')}-01`;
}

function generateCardNumber() {
    let num = '';
    for (let i = 0; i < 20; i++) num += Math.floor(Math.random() * 10);
    return num;
}

function generateCardType() {
    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
    const timestampPart = Math.floor(Date.now() / 1000).toString().slice(-5);
    return `${randomPart} Role HUBIS ${timestampPart}`;
}

function generateRandomDigits(length) {
    return Math.floor(Math.random() * Math.pow(10, length)).toString().padStart(length, '0');
}

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
            if (!wallet.account_number) {
                const accountNumber = generateAccountNumber();
                const { error: updateError } = await supabasePlayersSpacePrive
                    .from('player_wallets')
                    .update({ account_number: accountNumber })
                    .eq('id', wallet.id);
                if (updateError) throw updateError;
                wallet.account_number = accountNumber;
            }
            await ensureCardFields(wallet);
            displayCard();
        } else {
            // Créer le compte principal (sans carte)
            const accountNumber = generateAccountNumber();
            const { data: newWallet, error: insertError } = await supabasePlayersSpacePrive
                .from('player_wallets')
                .insert([{
                    player_id: currentProfile.id,
                    balance: 0,
                    balance_pending: 0,
                    bonus_inscription: 0,
                    account_number: accountNumber,
                    card_balance: 0,
                    followers_last_claimed: 0
                }])
                .select()
                .single();
            if (insertError) throw insertError;
            wallet = newWallet;
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
                card_status: 'active',
                card_balance: 0
            })
            .eq('id', w.id);
        if (error) throw error;
        Object.assign(w, {
            card_number: cardNumber,
            card_type: cardType,
            card_expiry: expiry,
            withdrawal_code: withdrawalCode,
            emarket_code: emarketCode,
            card_status: 'active',
            card_balance: 0
        });
    }
}

function displayCard() {
    document.getElementById('createCardSection').style.display = 'none';
    const container = document.getElementById('hubisCardContainer');
    container.style.display = 'block';
    const cardNumberElem = document.getElementById('cardNumber');
    if (cardNumberElem) {
        const masked = wallet.card_number.replace(/(.{4})/g, '$1 ').trim();
        cardNumberElem.textContent = masked;
    }
    const cardTypeElem = document.getElementById('cardType');
    if (cardTypeElem) cardTypeElem.textContent = wallet.card_type;
    const cardExpiryElem = document.getElementById('cardExpiry');
    if (cardExpiryElem) cardExpiryElem.textContent = formatExpiry(wallet.card_expiry);
    const cardBalanceElem = document.getElementById('cardBalance');
    if (cardBalanceElem) cardBalanceElem.textContent = `${wallet.card_balance || 0} FCFA`;
    const cardHolderElem = document.getElementById('cardHolder');
    if (cardHolderElem) cardHolderElem.textContent = currentProfile.full_name || 'Titulaire';
    const wCodeElem = document.getElementById('withdrawalCode');
    const eCodeElem = document.getElementById('emarketCode');
    if (wCodeElem) wCodeElem.textContent = wallet.withdrawal_code ? `Code retrait: ${wallet.withdrawal_code}` : 'Code retrait: •••••';
    if (eCodeElem) eCodeElem.textContent = wallet.emarket_code ? `Code e‑market: ${wallet.emarket_code}` : 'Code e‑market: ••••';
    updateCardButtonsState();
}

function updateCardButtonsState() {
    const blockBtn = document.getElementById('blockCardBtn');
    if (blockBtn && wallet) {
        const isActive = wallet.card_status === 'active';
        blockBtn.innerHTML = isActive ? '<i class="fas fa-lock"></i>' : '<i class="fas fa-lock-open"></i>';
        blockBtn.title = isActive ? 'Bloquer la carte' : 'Débloquer la carte';
    }
}

async function createCard() {
    if (!wallet) {
        showToast('Compte principal introuvable', 'error');
        return;
    }
    if (wallet.card_number) {
        showToast('Carte déjà existante', 'warning');
        return;
    }
    showLoader();
    try {
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
                card_status: 'active',
                card_balance: 0
            })
            .eq('id', wallet.id);
        if (error) throw error;
        Object.assign(wallet, {
            card_number: cardNumber,
            card_type: cardType,
            card_expiry: expiry,
            withdrawal_code: withdrawalCode,
            emarket_code: emarketCode,
            card_status: 'active',
            card_balance: 0
        });
        displayCard();
        showToast('Carte créée avec succès !', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erreur lors de la création de la carte', 'error');
    } finally {
        hideLoader();
    }
}

async function reloadCard() {
    if (!wallet) return;
    const amount = prompt('Montant à recharger (FCFA) :');
    if (!amount) return;
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
        showToast('Montant invalide', 'warning');
        return;
    }
    if (wallet.balance < numAmount) {
        showToast('Solde insuffisant sur le compte principal', 'error');
        return;
    }
    showLoader();
    try {
        // Débiter le compte principal
        const newBalance = wallet.balance - numAmount;
        const newCardBalance = (wallet.card_balance || 0) + numAmount;
        const { error } = await supabasePlayersSpacePrive
            .from('player_wallets')
            .update({
                balance: newBalance,
                card_balance: newCardBalance
            })
            .eq('id', wallet.id);
        if (error) throw error;
        wallet.balance = newBalance;
        wallet.card_balance = newCardBalance;

        // Enregistrer la transaction (rechargement de carte, immédiat)
        const reference = `RLOAD-${Date.now()}-${currentProfile.id}`;
        const { error: transError } = await supabasePlayersSpacePrive
            .from('player_transactions')
            .insert([{
                player_id: currentProfile.id,
                type: 'card_reload',
                amount: numAmount,
                status: 'approved',
                description: `Rechargement de carte`,
                reference: reference,
                balance_before: wallet.balance + numAmount,
                balance_after: wallet.balance
            }]);
        if (transError) throw transError;

        updateWalletUI();
        displayCard(); // met à jour l'affichage du solde de la carte
        await loadTransactions();
        showToast('Carte rechargée avec succès', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erreur lors du rechargement', 'error');
    } finally {
        hideLoader();
    }
}

async function cardAction(action) {
    if (!wallet) return;
    if (action === 'reload') {
        reloadCard();
        return;
    }
    currentCardAction = action;
    const titleElem = document.getElementById('cardActionTitle');
    if (titleElem) titleElem.innerText = action === 'block' ? 'Bloquer la carte' : 'Supprimer la carte';
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
    if (!recto || !verso) return;
    if (recto.style.display === 'none') {
        recto.style.display = 'block';
        verso.style.display = 'none';
        document.getElementById('flipCardBtn').innerHTML = '<i class="fas fa-eye"></i>';
        document.getElementById('flipCardBtn').title = 'Visualiser le verso';
    } else {
        recto.style.display = 'none';
        verso.style.display = 'block';
        document.getElementById('flipCardBtn').innerHTML = '<i class="fas fa-eye-slash"></i>';
        document.getElementById('flipCardBtn').title = 'Visualiser le recto';
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
        if (t.status === 'approved') {
            if (t.type === 'deposit' || t.type === 'bonus' || t.type === 'card_reload') {
                totalEarned += t.amount;
            } else if (t.type === 'withdraw' || t.type === 'purchase') {
                totalSpent += t.amount;
            }
        }
    });
    const totalEarnedElem = document.getElementById('totalEarned');
    const totalSpentElem = document.getElementById('totalSpent');
    if (totalEarnedElem) totalEarnedElem.textContent = `${totalEarned} FCFA`;
    if (totalSpentElem) totalSpentElem.textContent = `${totalSpent} FCFA`;
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
        const sign = (t.type === 'deposit' || t.type === 'bonus' || t.type === 'card_reload') ? '+' : '-';
        const amountClass = (sign === '+') ? 'positive' : 'negative';
        const icon = t.type === 'deposit' ? 'fa-arrow-down' : (t.type === 'withdraw' ? 'fa-arrow-up' : (t.type === 'card_reload' ? 'fa-credit-card' : 'fa-gift'));
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
    const statusColor = {
        pending: '#ffc107',
        approved: '#28a745',
        rejected: '#dc3545'
    } [transaction.status] || '#6c757d';
    const statusTextFr = {
        pending: 'EN ATTENTE',
        approved: 'APPROUVÉ',
        rejected: 'REJETÉ'
    } [transaction.status] || transaction.status;
    
    const verifyUrl = `https://hubisoccer.github.io/hubisoccer1st/verify-transaction.html?id=${transaction.id}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verifyUrl)}`;
    
    // Créer un conteneur avec dimensions fixes pour éviter les coupures
    const element = document.createElement('div');
    element.style.fontFamily = 'Poppins, sans-serif';
    element.style.width = '800px';
    element.style.padding = '20px';
    element.style.position = 'relative';
    element.style.backgroundColor = '#f8f0ff';
    element.style.color = '#1a1a1a';
    element.style.margin = '0 auto';
    element.style.boxSizing = 'border-box';
    element.style.backgroundImage = 'repeating-linear-gradient(45deg, rgba(85,27,140,0.05) 0px, rgba(85,27,140,0.05) 2px, transparent 2px, transparent 8px)';
    
    // Contenu principal
    const contentDiv = document.createElement('div');
    contentDiv.style.position = 'relative';
    contentDiv.style.zIndex = '2';
    contentDiv.innerHTML = `
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
            <tr><td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Nature</strong></td><td style="padding: 8px; border-bottom: 1px solid #ddd;">${transaction.type === 'deposit' ? 'Dépôt' : transaction.type === 'withdraw' ? 'Retrait' : transaction.type === 'card_reload' ? 'Rechargement carte' : 'Bonus'}</td></tr>
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
    `;
    element.appendChild(contentDiv);
    
    // Filigrane
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
        html2canvas: { scale: 2, useCORS: true, logging: false },
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

// ========== BONUS ABONNÉS (récurrent) ==========
async function loadFollowersCount() {
    if (!currentProfile) return;
    try {
        const { count, error } = await supabasePlayersSpacePrive
            .from('unified_follows')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', currentProfile.id);
        if (error) throw error;
        followersCount = count || 0;
        await updateBonusFollowers();
    } catch (err) {
        console.error(err);
    }
}

async function updateBonusFollowers() {
    if (!wallet) return;
    const lastClaimed = wallet.followers_last_claimed || 0;
    const newFollowers = followersCount - lastClaimed;
    if (newFollowers < 0) {
        // si le compteur a baissé (peut arriver si des abonnements sont supprimés), on réinitialise
        await supabasePlayersSpacePrive
            .from('player_wallets')
            .update({ followers_last_claimed: followersCount })
            .eq('id', wallet.id);
        wallet.followers_last_claimed = followersCount;
        document.getElementById('bonusMessage').textContent = `Prochain bonus à 50 abonnés : 5000 FCFA (actuellement ${followersCount})`;
        document.getElementById('withdrawBonusBtn').disabled = true;
        return;
    }
    const available = Math.floor(newFollowers / 50) * 5000;
    const bonusMsg = document.getElementById('bonusMessage');
    const withdrawBtn = document.getElementById('withdrawBonusBtn');
    if (available > 0) {
        bonusMsg.textContent = `${available} FCFA (${newFollowers} nouveaux abonnés) – Cliquez pour retirer`;
        withdrawBtn.disabled = false;
        withdrawBtn.dataset.amount = available;
        withdrawBtn.dataset.newFollowers = newFollowers;
    } else {
        const nextNeeded = 50 - (newFollowers % 50);
        bonusMsg.textContent = `Prochain bonus à ${nextNeeded} abonnés : 5000 FCFA (actuellement ${followersCount})`;
        withdrawBtn.disabled = true;
        withdrawBtn.dataset.amount = '';
        withdrawBtn.dataset.newFollowers = '';
    }
}

async function claimBonusFollowers() {
    const btn = document.getElementById('withdrawBonusBtn');
    const amount = parseInt(btn.dataset.amount);
    const newFollowers = parseInt(btn.dataset.newFollowers);
    if (!amount || amount <= 0) {
        showToast('Aucun bonus disponible', 'warning');
        return;
    }
    showLoader();
    try {
        // Créer une transaction de bonus
        const reference = `BONUS-FOLLOWERS-${Date.now()}-${currentProfile.id}`;
        const newBalance = wallet.balance + amount;
        const { error: transError } = await supabasePlayersSpacePrive
            .from('player_transactions')
            .insert([{
                player_id: currentProfile.id,
                type: 'bonus',
                amount: amount,
                status: 'approved', // bonus automatiquement approuvé
                description: `Bonus pour ${newFollowers} nouveaux abonnés (${followersCount} total)`,
                reference: reference,
                balance_before: wallet.balance,
                balance_after: newBalance
            }]);
        if (transError) throw transError;

        // Mettre à jour le solde du portefeuille
        const newClaimed = (wallet.followers_last_claimed || 0) + newFollowers;
        const { error: updateError } = await supabasePlayersSpacePrive
            .from('player_wallets')
            .update({
                balance: newBalance,
                followers_last_claimed: newClaimed
            })
            .eq('id', wallet.id);
        if (updateError) throw updateError;

        wallet.balance = newBalance;
        wallet.followers_last_claimed = newClaimed;

        // Enregistrer le palier (optionnel)
        await supabasePlayersSpacePrive
            .from('player_bonus_claims')
            .insert([{
                player_id: currentProfile.id,
                tier_id: 1, // palier 50
                claimed_at: new Date()
            }]);

        updateWalletUI();
        await loadTransactions();
        await updateBonusFollowers();
        showToast('Bonus retiré avec succès !', 'success');
    } catch (err) {
        console.error(err);
        showToast('Erreur lors du retrait du bonus', 'error');
    } finally {
        hideLoader();
    }
}

// ========== DÉPÔT / RETRAIT (compte principal) ==========
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

function openDepositModal() { document.getElementById('depositModal').style.display = 'block'; }
function closeDepositModal() { document.getElementById('depositModal').style.display = 'none'; }
function openWithdrawModal() { document.getElementById('withdrawModal').style.display = 'block'; }
function closeWithdrawModal() { document.getElementById('withdrawModal').style.display = 'none'; }
function closeCardActionModal() { document.getElementById('cardActionModal').classList.remove('active'); document.getElementById('cardActionCode').value = ''; currentCardAction = null; }

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
        const reference = `DEP-${Date.now()}-${currentProfile.id}`;
        const newBalance = wallet.balance + amount;
        const { error } = await supabasePlayersSpacePrive
            .from('player_transactions')
            .insert([{
                player_id: currentProfile.id,
                type: 'deposit',
                amount: amount,
                status: 'pending',
                description: `Dépôt via ${method}`,
                reference: reference,
                proof_url: proofUrl,
                balance_before: wallet.balance,
                balance_after: newBalance
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
        const reference = `WDR-${Date.now()}-${currentProfile.id}`;
        const newBalance = wallet.balance - amount;
        const { error } = await supabasePlayersSpacePrive
            .from('player_transactions')
            .insert([{
                player_id: currentProfile.id,
                type: 'withdraw',
                amount: amount,
                status: 'pending',
                description: `Retrait vers ${method} (${recipient})`,
                reference: reference,
                proof_url: proofUrl,
                balance_before: wallet.balance,
                balance_after: newBalance
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

document.getElementById('withdrawBonusBtn').addEventListener('click', claimBonusFollowers);
document.getElementById('exportCsvBtn').addEventListener('click', exportCSV);
document.getElementById('viewAllTransactionsBtn').addEventListener('click', () => {
    window.location.href = 'transactions-detail.html';
});
document.getElementById('viewAllTransactionsBtnBottom').addEventListener('click', () => {
    window.location.href = 'transactions-detail.html';
});

// ========== UI ==========
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
    const walletBalanceElem = document.getElementById('walletBalance');
    const pendingBalanceElem = document.getElementById('pendingBalance');
    const accountNumberElem = document.getElementById('accountNumber');
    if (walletBalanceElem) walletBalanceElem.textContent = `${wallet.balance || 0} FCFA`;
    if (pendingBalanceElem) pendingBalanceElem.textContent = `${wallet.balance_pending || 0} FCFA`;
    if (accountNumberElem) accountNumberElem.textContent = `Compte: ${wallet.account_number || '••••'}`;
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

    const depositBtn = document.getElementById('depositBtn');
    if (depositBtn) depositBtn.addEventListener('click', openDepositModal);
    const withdrawBtn = document.getElementById('withdrawBtn');
    if (withdrawBtn) withdrawBtn.addEventListener('click', openWithdrawModal);
    const createCardBtn = document.getElementById('createCardBtn');
    if (createCardBtn) createCardBtn.addEventListener('click', createCard);
    const reloadCardBtn = document.getElementById('reloadCardBtn');
    if (reloadCardBtn) reloadCardBtn.addEventListener('click', () => cardAction('reload'));
    const blockCardBtn = document.getElementById('blockCardBtn');
    if (blockCardBtn) blockCardBtn.addEventListener('click', () => cardAction('block'));
    const deleteCardBtn = document.getElementById('deleteCardBtn');
    if (deleteCardBtn) deleteCardBtn.addEventListener('click', () => cardAction('delete'));
    const flipCardBtn = document.getElementById('flipCardBtn');
    if (flipCardBtn) flipCardBtn.addEventListener('click', flipCard);
    const confirmCardActionBtn = document.getElementById('confirmCardActionBtn');
    if (confirmCardActionBtn) confirmCardActionBtn.addEventListener('click', confirmCardAction);

    window.closeDepositModal = closeDepositModal;
    window.closeWithdrawModal = closeWithdrawModal;
    window.closeCardActionModal = closeCardActionModal;

    addMenuHandle();
    initUserMenu();
    initSidebar();
    initLogout();

    const langSelect = document.getElementById('langSelect');
    if (langSelect) langSelect.addEventListener('change', (e) => {
        showToast(`Langue changée en ${e.target.options[e.target.selectedIndex].text}`, 'info');
    });
    const languageLink = document.getElementById('languageLink');
    if (languageLink) languageLink.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Changement de langue bientôt disponible', 'info');
    });
    console.log('✅ Initialisation terminée');
});
