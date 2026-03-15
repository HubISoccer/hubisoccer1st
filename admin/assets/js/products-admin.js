// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseProductemarket = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ÉLÉMENTS DOM =====
// Statistiques
const statProducts = document.getElementById('statProducts');
const statOrders = document.getElementById('statOrders');
const statMessages = document.getElementById('statMessages');
const statCustomers = document.getElementById('statCustomers');

// Produits
const productsList = document.getElementById('productsList');
const searchProducts = document.getElementById('searchProducts');
const refreshProducts = document.getElementById('refreshProducts');
const addProductBtn = document.getElementById('addProductBtn');

// Commandes
const ordersListFull = document.getElementById('ordersListFull');
const searchOrders = document.getElementById('searchOrders');
const refreshOrders = document.getElementById('refreshOrders');

// Messages
const messagesListFull = document.getElementById('messagesListFull');
const searchMessages = document.getElementById('searchMessages');
const refreshMessages = document.getElementById('refreshMessages');

// Modales
const productModal = document.getElementById('productModal');
const modalProductTitle = document.getElementById('modalProductTitle');
const productForm = document.getElementById('productForm');
const productId = document.getElementById('productId');
const nameInput = document.getElementById('name');
const descriptionInput = document.getElementById('description');
const priceInput = document.getElementById('price');
const stockSelect = document.getElementById('stock');
const categorySelect = document.getElementById('category');
const featuredSelect = document.getElementById('featured');
const mediaFile = document.getElementById('mediaFile');
const imageUrlInput = document.getElementById('imageUrl');
const paymentUrlInput = document.getElementById('payment_url');
const returnUrlInput = document.getElementById('return_url');

const orderModal = document.getElementById('orderModal');
const orderDetail = document.getElementById('orderDetail');
const validateOrderBtn = document.getElementById('validateOrderBtn');
const deleteOrderBtn = document.getElementById('deleteOrderBtn'); // Nouveau bouton

const messageModal = document.getElementById('messageModal');
const messageDetail = document.getElementById('messageDetail');
const replyMessage = document.getElementById('replyMessage');
const sendReplyBtn = document.getElementById('sendReplyBtn');
const deleteMessageBtn = document.getElementById('deleteMessageBtn'); // Nouveau bouton

// ===== ÉTAT =====
let currentOrderId = null;
let currentMessageId = null;

// ===== CHARGEMENT DES DONNÉES =====
async function loadAll() {
    await Promise.all([
        loadProducts(),
        loadOrders(),
        loadMessages(),
        loadStats()
    ]);
}

async function loadStats() {
    const [products, orders, messages, customers] = await Promise.all([
        supabaseProductemarket.from('products').select('*', { count: 'exact', head: true }),
        supabaseProductemarket.from('emarket_orders').select('*', { count: 'exact', head: true }),
        supabaseProductemarket.from('emarket_messages').select('*', { count: 'exact', head: true }).eq('is_read', false),
        supabaseProductemarket.from('emarket_customers').select('*', { count: 'exact', head: true })
    ]);
    statProducts.textContent = products.count || 0;
    statOrders.textContent = orders.count || 0;
    statMessages.textContent = messages.count || 0;
    statCustomers.textContent = customers.count || 0;
}

// ===== PRODUITS =====
async function loadProducts(search = '') {
    let query = supabaseProductemarket.from('products').select('*').order('id', { ascending: false });
    if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }
    const { data, error } = await query;
    if (error) {
        console.error('Erreur chargement produits:', error);
        productsList.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }
    renderProducts(data || []);
}

function renderProducts(products) {
    if (!products.length) {
        productsList.innerHTML = '<p class="no-data">Aucun produit.</p>';
        return;
    }
    let html = '';
    products.forEach(p => {
        const stockText = p.stock ? 'En stock' : 'Épuisé';
        const stockClass = p.stock ? '' : 'out-of-stock';
        html += `
            <div class="list-item" data-id="${p.id}">
                <div class="info">
                    <strong>${p.name} ${p.featured ? '<span class="badge">Vedette</span>' : ''}</strong>
                    <div class="details">
                        <span>${p.category || 'Non catégorisé'}</span>
                        <span class="${stockClass}">${stockText}</span>
                        <span>${p.price} FCFA</span>
                    </div>
                    <small>${p.description || ''}</small>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    productsList.innerHTML = html;
}

window.editProduct = async (id) => {
    const { data: p, error } = await supabaseProductemarket
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
    if (error) {
        showToast('Erreur chargement produit', 'error');
        return;
    }
    modalProductTitle.textContent = 'Modifier un produit';
    productId.value = p.id;
    nameInput.value = p.name || '';
    descriptionInput.value = p.description || '';
    priceInput.value = p.price || '';
    stockSelect.value = p.stock ? 'true' : 'false';
    categorySelect.value = p.category || '';
    featuredSelect.value = p.featured ? 'true' : 'false';
    imageUrlInput.value = p.image_url || '';
    paymentUrlInput.value = p.payment_url || '';
    returnUrlInput.value = p.return_url || '';
    productModal.classList.add('active');
};

window.deleteProduct = async (id) => {
    if (!confirm('Supprimer définitivement ce produit ?')) return;
    const { error } = await supabaseProductemarket
        .from('products')
        .delete()
        .eq('id', id);
    if (error) {
        showToast('Erreur suppression: ' + error.message, 'error');
    } else {
        showToast('Produit supprimé', 'success');
        loadProducts();
        loadStats();
    }
};

function openAddProductModal() {
    modalProductTitle.textContent = 'Ajouter un produit';
    productId.value = '';
    nameInput.value = '';
    descriptionInput.value = '';
    priceInput.value = '';
    stockSelect.value = '';
    categorySelect.value = '';
    featuredSelect.value = '';
    mediaFile.value = '';
    imageUrlInput.value = '';
    paymentUrlInput.value = '';
    returnUrlInput.value = '';
    productModal.classList.add('active');
}

function closeProductModal() {
    productModal.classList.remove('active');
    productForm.reset();
}

window.closeProductModal = closeProductModal;

// Upload de fichier avec progression (pourcentage)
async function uploadFile(file, bucket = 'product-medias') {
    if (!file) return null;
    const submitBtn = productForm.querySelector('.btn-submit');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Upload...';

    let progressSpan = document.getElementById('uploadProgress');
    if (!progressSpan) {
        progressSpan = document.createElement('span');
        progressSpan.id = 'uploadProgress';
        progressSpan.style.marginLeft = '10px';
        progressSpan.style.fontSize = '0.9rem';
        progressSpan.style.color = 'var(--gold)';
        submitBtn.parentNode.insertBefore(progressSpan, submitBtn.nextSibling);
    }

    return new Promise((resolve, reject) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`, true);
        xhr.setRequestHeader('apikey', SUPABASE_ANON_KEY);
        xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressSpan.textContent = `${percent}%`;
                submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Upload ${percent}%`;
            }
        });

        xhr.addEventListener('load', () => {
            progressSpan.textContent = '';
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            if (xhr.status === 200) {
                const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;
                resolve(publicUrl);
            } else {
                let errorMsg = 'Upload échoué';
                try {
                    const err = JSON.parse(xhr.responseText);
                    errorMsg = err.message || errorMsg;
                } catch (e) {}
                reject(new Error(errorMsg));
            }
        });

        xhr.addEventListener('error', () => {
            progressSpan.textContent = '';
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            reject(new Error('Erreur réseau'));
        });

        xhr.send(formData);
    });
}

// Soumission formulaire produit
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = productId.value;
    const name = nameInput.value.trim();
    const description = descriptionInput.value.trim();
    const price = parseInt(priceInput.value);
    const stock = stockSelect.value === 'true' ? 1 : 0;
    const category = categorySelect.value;
    const featured = featuredSelect.value === 'true';
    let image_url = imageUrlInput.value;

    try {
        if (mediaFile.files.length > 0) {
            const url = await uploadFile(mediaFile.files[0]);
            if (url) image_url = url;
        }

        const productData = {
            name,
            description,
            price,
            stock,
            category,
            featured,
            image_url,
            payment_url: paymentUrlInput.value.trim(),
            return_url: returnUrlInput.value.trim()
        };

        let result;
        if (id) {
            result = await supabaseProductemarket
                .from('products')
                .update(productData)
                .eq('id', id);
        } else {
            result = await supabaseProductemarket
                .from('products')
                .insert([productData]);
        }

        if (result.error) throw result.error;

        showToast('Opération réussie', 'success');
        closeProductModal();
        loadProducts();
        loadStats();
    } catch (err) {
        console.error('Erreur:', err);
        showToast('Erreur : ' + err.message, 'error');
    }
});

// ===== COMMANDES =====
async function loadOrders(search = '') {
    let query = supabaseProductemarket
        .from('emarket_orders')
        .select('*, emarket_customers(first_name, last_name, email)')
        .order('created_at', { ascending: false });
    if (search) {
        query = query.ilike('id', `%${search}%`);
    }
    const { data, error } = await query;
    if (error) {
        console.error('Erreur chargement commandes:', error);
        ordersListFull.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }
    renderOrders(data || []);
}

function renderOrders(orders) {
    if (!orders.length) {
        ordersListFull.innerHTML = '<p class="no-data">Aucune commande.</p>';
        return;
    }
    let html = '';
    orders.forEach(o => {
        const customer = o.emarket_customers || {};
        const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Client inconnu';
        html += `
            <div class="list-item" data-id="${o.id}">
                <div class="info">
                    <strong>Commande #${o.id}</strong> - ${fullName}
                    <div class="details">
                        <span>${new Date(o.created_at).toLocaleString()}</span>
                        <span>Total TTC: ${o.total_ttc} FCFA</span>
                        <span class="status-${o.status}">${o.status}</span>
                    </div>
                </div>
                <div class="actions">
                    <button class="view" onclick="viewOrder(${o.id})"><i class="fas fa-eye"></i></button>
                    <button class="delete" onclick="deleteOrder(${o.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    ordersListFull.innerHTML = html;
}

window.viewOrder = async (id) => {
    const { data: order, error } = await supabaseProductemarket
        .from('emarket_orders')
        .select('*, emarket_customers(*), emarket_order_items(*, products(*))')
        .eq('id', id)
        .single();
    if (error) {
        showToast('Erreur chargement commande', 'error');
        return;
    }
    currentOrderId = id;
    const customer = order.emarket_customers || {};
    const items = order.emarket_order_items || [];
    let itemsHtml = '';
    items.forEach(item => {
        itemsHtml += `<p>${item.products?.name} x${item.quantity} = ${item.total_price} FCFA</p>`;
    });
    orderDetail.innerHTML = `
        <p><strong>Client :</strong> ${customer.first_name} ${customer.last_name}</p>
        <p><strong>Email :</strong> ${customer.email}</p>
        <p><strong>Téléphone :</strong> ${customer.phone || '-'}</p>
        <p><strong>Date :</strong> ${new Date(order.created_at).toLocaleString()}</p>
        <p><strong>Statut :</strong> ${order.status}</p>
        <p><strong>Total HT :</strong> ${order.total_ht} FCFA</p>
        <p><strong>TVA (18%) :</strong> ${order.tva} FCFA</p>
        <p><strong>Total TTC :</strong> ${order.total_ttc} FCFA</p>
        <p><strong>Articles :</strong></p>
        ${itemsHtml}
        ${order.invoice_proforma_url ? `<p><a href="${order.invoice_proforma_url}" target="_blank">Facture proforma</a></p>` : ''}
        ${order.invoice_definitive_url ? `<p><a href="${order.invoice_definitive_url}" target="_blank">Facture définitive</a></p>` : ''}
        ${order.tracking_info ? `<p>Suivi : ${order.tracking_info}</p>` : ''}
    `;
    validateOrderBtn.style.display = order.status === 'en_attente' ? 'inline-block' : 'none';
    deleteOrderBtn.style.display = 'inline-block';
    orderModal.classList.add('active');
};

window.deleteOrder = async (id) => {
    if (!confirm('Supprimer définitivement cette commande ?')) return;
    const { error } = await supabaseProductemarket
        .from('emarket_orders')
        .delete()
        .eq('id', id);
    if (error) {
        showToast('Erreur suppression: ' + error.message, 'error');
    } else {
        showToast('Commande supprimée', 'success');
        closeOrderModal();
        loadOrders();
        loadStats();
    }
};

function closeOrderModal() {
    orderModal.classList.remove('active');
    currentOrderId = null;
}

window.closeOrderModal = closeOrderModal;

validateOrderBtn.addEventListener('click', async () => {
    if (!currentOrderId) return;
    const { error } = await supabaseProductemarket
        .from('emarket_orders')
        .update({ status: 'expédiée' })
        .eq('id', currentOrderId);
    if (error) {
        showToast('Erreur mise à jour', 'error');
    } else {
        showToast('Commande marquée comme expédiée', 'success');
        closeOrderModal();
        loadOrders();
        loadStats();
    }
});

// ===== MESSAGES =====
async function loadMessages(search = '') {
    let query = supabaseProductemarket
        .from('emarket_messages')
        .select('*, emarket_customers(first_name, last_name, email)')
        .order('created_at', { ascending: false });
    if (search) {
        query = query.ilike('message', `%${search}%`);
    }
    const { data, error } = await query;
    if (error) {
        console.error('Erreur chargement messages:', error);
        messagesListFull.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }
    renderMessages(data || []);
}

function renderMessages(messages) {
    if (!messages.length) {
        messagesListFull.innerHTML = '<p class="no-data">Aucun message.</p>';
        return;
    }
    let html = '';
    messages.forEach(m => {
        const customer = m.emarket_customers || {};
        const fullName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim() || 'Client inconnu';
        html += `
            <div class="list-item ${!m.is_read ? 'unread' : ''}" data-id="${m.id}">
                <div class="info">
                    <strong>${fullName}</strong>
                    <div class="details">
                        <span>${new Date(m.created_at).toLocaleString()}</span>
                        <span>${m.order_id ? 'Commande #' + m.order_id : ''}</span>
                    </div>
                    <small>${m.message.substring(0, 80)}...</small>
                </div>
                <div class="actions">
                    <button class="view" onclick="viewMessage(${m.id})"><i class="fas fa-eye"></i></button>
                    <button class="delete" onclick="deleteMessage(${m.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    messagesListFull.innerHTML = html;
}

window.viewMessage = async (id) => {
    const { data: msg, error } = await supabaseProductemarket
        .from('emarket_messages')
        .select('*, emarket_customers(*)')
        .eq('id', id)
        .single();
    if (error) {
        showToast('Erreur chargement message', 'error');
        return;
    }
    currentMessageId = id;
    const customer = msg.emarket_customers || {};
    messageDetail.innerHTML = `
        <p><strong>De :</strong> ${customer.first_name} ${customer.last_name} (${customer.email})</p>
        <p><strong>Date :</strong> ${new Date(msg.created_at).toLocaleString()}</p>
        <p><strong>Commande :</strong> ${msg.order_id ? '#' + msg.order_id : 'Non lié'}</p>
        <p><strong>Message :</strong><br>${msg.message}</p>
        ${msg.admin_reply ? `<p><strong>Réponse admin :</strong> ${msg.admin_reply}</p>` : ''}
    `;
    replyMessage.value = '';
    messageModal.classList.add('active');

    if (!msg.is_read) {
        await supabaseProductemarket
            .from('emarket_messages')
            .update({ is_read: true })
            .eq('id', id);
        loadMessages();
        loadStats();
    }
};

function closeMessageModal() {
    messageModal.classList.remove('active');
    currentMessageId = null;
}

window.closeMessageModal = closeMessageModal;

sendReplyBtn.addEventListener('click', async () => {
    if (!currentMessageId) return;
    const reply = replyMessage.value.trim();
    if (!reply) {
        showToast('Veuillez écrire une réponse', 'error');
        return;
    }
    const { error } = await supabaseProductemarket
        .from('emarket_messages')
        .update({ admin_reply: reply })
        .eq('id', currentMessageId);
    if (error) {
        showToast('Erreur envoi réponse : ' + error.message, 'error');
    } else {
        showToast('Réponse envoyée', 'success');
        closeMessageModal();
        loadMessages();
        loadStats();
    }
});

window.deleteMessage = async (id) => {
    if (!confirm('Supprimer ce message ?')) return;
    const { error } = await supabaseProductemarket
        .from('emarket_messages')
        .delete()
        .eq('id', id);
    if (error) {
        showToast('Erreur suppression: ' + error.message, 'error');
    } else {
        showToast('Message supprimé', 'success');
        loadMessages();
        loadStats();
    }
};

// ===== RECHERCHE =====
searchProducts?.addEventListener('input', (e) => loadProducts(e.target.value));
searchOrders?.addEventListener('input', (e) => loadOrders(e.target.value));
searchMessages?.addEventListener('input', (e) => loadMessages(e.target.value));

// ===== RAFRAÎCHISSEMENT =====
refreshProducts?.addEventListener('click', () => loadProducts());
refreshOrders?.addEventListener('click', () => loadOrders());
refreshMessages?.addEventListener('click', () => loadMessages());

// ===== AJOUT PRODUIT =====
addProductBtn.addEventListener('click', openAddProductModal);

// ===== TOAST =====
function showToast(message, type = 'info') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== INIT =====
document.addEventListener('DOMContentLoaded', loadAll);