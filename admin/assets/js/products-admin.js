// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Éléments DOM
const productsList = document.getElementById('productsList');
const modal = document.getElementById('productModal');
const modalTitle = document.getElementById('modalTitle');
const form = document.getElementById('productForm');
const productId = document.getElementById('productId');
const nameInput = document.getElementById('name');
const descriptionInput = document.getElementById('description');
const priceInput = document.getElementById('price');
const imageInput = document.getElementById('image_url');
const categorySelect = document.getElementById('category');
const stockSelect = document.getElementById('stock');
const featuredSelect = document.getElementById('featured');
const paymentUrlInput = document.getElementById('payment_url');
const returnUrlInput = document.getElementById('return_url');

// Charger les produits
async function loadProducts() {
    const { data: products, error } = await supabaseClient
        .from('products')
        .select('*')
        .order('id');

    if (error) {
        console.error('Erreur chargement produits:', error);
        productsList.innerHTML = '<p class="no-data">Erreur de chargement.</p>';
        return;
    }

    if (!products || products.length === 0) {
        productsList.innerHTML = '<p class="no-data">Aucun produit.</p>';
        return;
    }

    let html = '';
    products.forEach(p => {
        html += `
            <div class="list-item" data-id="${p.id}">
                <div class="info">
                    <strong>${p.name} ${p.featured ? '<span class="badge">Vedette</span>' : ''}</strong>
                    <div class="details">
                        <span>${p.category}</span>
                        <span>${p.stock ? 'En stock' : 'Épuisé'}</span>
                        <span>Prix: ${p.price} FCFA</span>
                    </div>
                    <small>Paiement: <a href="${p.payment_url}" target="_blank">lien</a> | Retour: ${p.return_url}</small>
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

// Ouvrir modale ajout
function openAddModal() {
    modalTitle.textContent = 'Ajouter un produit';
    productId.value = '';
    nameInput.value = '';
    descriptionInput.value = '';
    priceInput.value = '';
    imageInput.value = '';
    categorySelect.value = '';
    stockSelect.value = '';
    featuredSelect.value = '';
    paymentUrlInput.value = '';
    returnUrlInput.value = 'suivi.html';
    modal.classList.add('active');
}

// Éditer un produit
window.editProduct = async (id) => {
    const { data: p, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert('Erreur chargement produit');
        return;
    }

    modalTitle.textContent = 'Modifier un produit';
    productId.value = p.id;
    nameInput.value = p.name;
    descriptionInput.value = p.description;
    priceInput.value = p.price;
    imageInput.value = p.image_url;
    categorySelect.value = p.category;
    stockSelect.value = p.stock ? 'true' : 'false';
    featuredSelect.value = p.featured ? 'true' : 'false';
    paymentUrlInput.value = p.payment_url || '';
    returnUrlInput.value = p.return_url || 'suivi.html';
    modal.classList.add('active');
};

// Supprimer un produit
window.deleteProduct = async (id) => {
    if (!confirm('Supprimer ce produit ?')) return;
    const { error } = await supabaseClient
        .from('products')
        .delete()
        .eq('id', id);

    if (error) {
        alert('Erreur suppression : ' + error.message);
    } else {
        loadProducts();
    }
};

// Fermer modale
window.closeModal = () => {
    modal.classList.remove('active');
};

// Soumission formulaire
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = productId.value;
    const name = nameInput.value;
    const description = descriptionInput.value;
    const price = parseInt(priceInput.value);
    const image_url = imageInput.value;
    const category = categorySelect.value;
    const stockValue = stockSelect.value === 'true';
    const featuredValue = featuredSelect.value === 'true';

    const productData = {
        name,
        description,
        price,
        image_url,
        category,
        stock: stockValue ? 1 : 0,
        featured: featuredValue,
        payment_url: paymentUrlInput.value,
        return_url: returnUrlInput.value
    };

    if (id === '') {
        const { error } = await supabaseClient
            .from('products')
            .insert([productData]);
        if (error) {
            alert('Erreur ajout : ' + error.message);
        } else {
            closeModal();
            loadProducts();
        }
    } else {
        const { error } = await supabaseClient
            .from('products')
            .update(productData)
            .eq('id', id);
        if (error) {
            alert('Erreur modification : ' + error.message);
        } else {
            closeModal();
            loadProducts();
        }
    }
});

// Bouton ajout
document.getElementById('addProductBtn').addEventListener('click', openAddModal);

// Déconnexion
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// Chargement initial
loadProducts();
