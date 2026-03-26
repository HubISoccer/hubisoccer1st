const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabasePlayersSpacePrive = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentProfile = null;
let wallet = null;
let transactions = [];
let followersCount = 0;
let bonusTiers = [];

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
        } else {
            const { data: newWallet, error: insertError } = await supabasePlayersSpacePrive
                .from('player_wallets')
                .insert([{
                    player_id: currentProfile.id,
                    balance: 0,
                    balance_pending: 0,
                    bonus_inscription: 0
                }])
                .select()
                .single();
            if (insertError) throw insertError;
            wallet = newWallet;
            const accountNumber = `HUB${String(wallet.id).padStart(8, '0')}`;
            const { error: updateError } = await supabasePlayersSpacePrive
                .from('player_wallets')
                .update({ account_number: accountNumber })
                .eq('id', wallet.id);
            if (updateError) console.error('Erreur mise à jour account_number:', updateError);
            else wallet.account_number = accountNumber;
        }
        const cardNumberElem = document.getElementById('cardNumber');
        if (cardNumberElem && wallet.account_number) {
            const masked = wallet.account_number.replace(/(.{4})/g, '$1 ').trim();
            cardNumberElem.textContent = masked;
        }
        document.getElementById('pendingBalance').textContent = `${wallet.balance_pending || 0} FCFA`;
        return wallet;
    } catch (err) {
        console.error(err);
        showToast('Erreur chargement portefeuille', 'error');
        return null;
    } finally {
        hideLoader();
    }
}

async function loadTransactions() {
    if (!currentProfile) return;
    showLoader();
    try {
        const { data, error } = await supabasePlayersSpacePrive
            .from('player_transactions')
            .select('*')
            .eq('player_id', currentProfile.id)
            .order('created_at', { ascending: false });
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
    const balanceBefore = transaction.balance_before ?? 'N/A';
    const balanceAfter = transaction.balance_after ?? 'N/A';

    const element = document.createElement('div');
    element.style.padding = '20px';
    element.style.fontFamily = 'Poppins, sans-serif';
    element.innerHTML = `
        <h2>Reçu de transaction</h2>
        <p><strong>Référence :</strong> ${escapeHtml(transaction.reference)}</p>
        <p><strong>Date :</strong> ${new Date(transaction.created_at).toLocaleString('fr-FR')}</p>
        <p><strong>Type :</strong> ${transaction.type === 'deposit' ? 'Dépôt' : transaction.type === 'withdraw' ? 'Retrait' : 'Bonus'}</p>
        <p><strong>Montant :</strong> ${transaction.amount} FCFA</p>
        <p><strong>Statut :</strong> ${transaction.status === 'pending' ? 'En attente' : transaction.status === 'approved' ? 'Approuvé' : 'Rejeté'}</p>
        <p><strong>Description :</strong> ${escapeHtml(transaction.description || '')}</p>
        ${transaction.admin_notes ? `<p><strong>Notes admin :</strong> ${escapeHtml(transaction.admin_notes)}</p>` : ''}
        ${balanceBefore !== 'N/A' ? `<p><strong>Solde avant :</strong> ${balanceBefore} FCFA</p>` : ''}
        ${balanceAfter !== 'N/A' ? `<p><strong>Solde après :</strong> ${balanceAfter} FCFA</p>` : ''}
        <hr>
        <p>HubISoccer - Reçu officiel</p>
    `;
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

function openDepositModal() { document.getElementById('depositModal').style.display = 'block'; }
function closeDepositModal() { document.getElementById('depositModal').style.display = 'none'; }
function openWithdrawModal() { document.getElementById('withdrawModal').style.display = 'block'; }
function closeWithdrawModal() { document.getElementById('withdrawModal').style.display = 'none'; }

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

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Initialisation revenue');
    const user = await checkSession();
    if (!user) return;
    await loadProfile();
    if (!currentProfile) return;
    await loadOrCreateWallet();
    if (!wallet) return;
    await loadTransactions();
    await loadFollowersCount();

    document.getElementById('depositBtn').addEventListener('click', openDepositModal);
    document.getElementById('withdrawBtn').addEventListener('click', openWithdrawModal);
    window.closeDepositModal = closeDepositModal;
    window.closeWithdrawModal = closeWithdrawModal;

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
