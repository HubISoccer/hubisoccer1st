// ===== DONNÉES PAR DÉFAUT =====
const defaultProducts = [
    {
        id: 'pack1',
        name: 'Pack Starter',
        description: 'Ebook "Guide du Jeune Footballeur" + Pommade chauffante + Maillot au choix',
        price: 5000,
        image: 'public/img/ebook-cover.png',
        category: 'pack',
        featured: true,
        stock: true
    },
    {
        id: 'pack2',
        name: 'Pack Premium',
        description: 'Ebook + Kit couleur au choix + Coaching spécialisé (1h)',
        price: 15000,
        image: 'public/img/kitviolet.jpg',
        category: 'pack',
        featured: true,
        stock: true
    },
    {
        id: 'pack3',
        name: 'Pack Aspirant',
        description: 'Ebook "Guide du Jeune Footballeur" (version PDF)',
        price: 2000,
        image: 'public/img/ebook-cover.png',
        category: 'pack',
        featured: true,
        stock: true
    },
    {
        id: 'kit1',
        name: 'Kit Violet',
        description: 'Ensemble complet (maillot, short, chaussettes)',
        price: 8000,
        image: 'public/img/kitviolet.jpg',
        category: 'kit',
        featured: false,
        stock: true
    },
    {
        id: 'kit2',
        name: 'Kit Noir',
        description: 'Ensemble complet (maillot, short, chaussettes)',
        price: 8000,
        image: 'public/img/kitnoir.jpg',
        category: 'kit',
        featured: false,
        stock: true
    },
    {
        id: 'kit3',
        name: 'Kit Jaune',
        description: 'Ensemble complet (maillot, short, chaussettes)',
        price: 8000,
        image: 'public/img/kitjaune.jpg',
        category: 'kit',
        featured: false,
        stock: true
    },
    {
        id: 'sac1',
        name: 'Sac tout-en-un',
        description: 'Grand sac de sport compartimenté',
        price: 12000,
        image: 'public/img/Sac-touten1.jpg',
        category: 'sac',
        featured: false,
        stock: true
    },
    {
        id: 'sac2',
        name: 'Sac complet',
        description: 'Sac + gourde + protège-tibia',
        price: 15000,
        image: 'public/img/sac-complet.jpg',
        category: 'sac',
        featured: false,
        stock: true
    }
];

// Initialisation localStorage
if (!localStorage.getItem('emarket_products')) {
    localStorage.setItem('emarket_products', JSON.stringify(defaultProducts));
}

// ===== ÉLÉMENTS DOM =====
const productsList = document.getElementById('productsList');
const modal = document.getElementById('productModal');
const modalTitle = document.getElementById('modalTitle');
const form = document.getElementById('productForm');
const productId = document.getElementById('productId');
const nameInput = document.getElementById('name');
const descriptionInput = document.getElementById('description');
const priceInput = document.getElementById('price');
const imageInput = document.getElementById('image');
const categorySelect = document.getElementById('category');
const stockSelect = document.getElementById('stock');
const featuredSelect = document.getElementById('featured');

// ===== CHARGEMENT DES PRODUITS =====
function loadProducts() {
    const products = JSON.parse(localStorage.getItem('emarket_products')) || [];
    let html = '';
    products.forEach((p, index) => {
        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${p.name} ${p.featured ? '<span class="badge">Vedette</span>' : ''}</strong>
                    <div class="details">
                        <span>${p.category}</span>
                        <span>${p.stock ? 'En stock' : 'Épuisé'}</span>
                    </div>
                    <span class="price">${p.price} FCFA</span>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editProduct(${index})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteProduct(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    productsList.innerHTML = html || '<p class="no-data">Aucun produit.</p>';
}

// ===== OUVERTURE MODALE AJOUT =====
function openAddModal() {
    modalTitle.textContent = 'Ajouter un produit';
    productId.value = '';
    nameInput.value = '';
    descriptionInput.value = '';
    priceInput.value = '';
    imageInput.value = '';
    categorySelect.value = 'pack';
    stockSelect.value = 'true';
    featuredSelect.value = 'false';
    modal.classList.add('active');
}

// ===== ÉDITION =====
window.editProduct = (index) => {
    const products = JSON.parse(localStorage.getItem('emarket_products'));
    const p = products[index];
    modalTitle.textContent = 'Modifier un produit';
    productId.value = index;
    nameInput.value = p.name;
    descriptionInput.value = p.description;
    priceInput.value = p.price;
    imageInput.value = p.image;
    categorySelect.value = p.category;
    stockSelect.value = p.stock.toString();
    featuredSelect.value = p.featured.toString();
    modal.classList.add('active');
};

// ===== FERMETURE MODALE =====
window.closeModal = () => {
    modal.classList.remove('active');
};

// ===== SUPPRESSION =====
window.deleteProduct = (index) => {
    if (!confirm('Supprimer ce produit ?')) return;
    let products = JSON.parse(localStorage.getItem('emarket_products'));
    products.splice(index, 1);
    localStorage.setItem('emarket_products', JSON.stringify(products));
    loadProducts();
};

// ===== GESTION DU FORMULAIRE =====
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = productId.value;
    let products = JSON.parse(localStorage.getItem('emarket_products')) || [];

    const newProduct = {
        id: index === '' ? 'prod' + Date.now() : products[index].id,
        name: nameInput.value,
        description: descriptionInput.value,
        price: parseInt(priceInput.value),
        image: imageInput.value,
        category: categorySelect.value,
        stock: stockSelect.value === 'true',
        featured: featuredSelect.value === 'true'
    };

    if (index === '') {
        products.push(newProduct);
    } else {
        products[index] = newProduct;
    }
    localStorage.setItem('emarket_products', JSON.stringify(products));
    closeModal();
    loadProducts();
});

// ===== BOUTON D'AJOUT =====
document.getElementById('addProductBtn').addEventListener('click', openAddModal);

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadProducts();