// ===== DONNÉES PAR DÉFAUT =====
const defaultUsers = [
    {
        id: 1,
        nom: 'Admin Principal',
        email: 'admin@hubisoccer.com',
        role: 'admin',
        dateCreation: new Date().toISOString()
    },
    {
        id: 2,
        nom: 'Koffi Soglo',
        email: 'koffi@example.com',
        role: 'joueur',
        dateCreation: new Date().toISOString()
    },
    {
        id: 3,
        nom: 'Moussa Diop',
        email: 'moussa@example.com',
        role: 'coach',
        dateCreation: new Date().toISOString()
    }
];

// Initialisation localStorage
if (!localStorage.getItem('users')) {
    localStorage.setItem('users', JSON.stringify(defaultUsers));
}

// ===== ÉLÉMENTS DOM =====
const usersList = document.getElementById('usersList');
const modal = document.getElementById('userModal');
const modalTitle = document.getElementById('modalTitle');
const form = document.getElementById('userForm');
const userId = document.getElementById('userId');
const nomInput = document.getElementById('nom');
const emailInput = document.getElementById('email');
const roleSelect = document.getElementById('role');
const passwordInput = document.getElementById('password');

// ===== CHARGEMENT DES UTILISATEURS =====
function loadUsers() {
    const users = JSON.parse(localStorage.getItem('users')) || [];
    if (users.length === 0) {
        usersList.innerHTML = '<p class="no-data">Aucun utilisateur.</p>';
        return;
    }

    let html = '';
    users.forEach((user, index) => {
        const date = new Date(user.dateCreation).toLocaleDateString('fr-FR');
        html += `
            <div class="list-item" data-index="${index}">
                <div class="info">
                    <strong>${user.nom}</strong>
                    <div class="details">
                        <span>${user.email}</span>
                        <span>Créé le ${date}</span>
                    </div>
                    <span class="role">${user.role}</span>
                </div>
                <div class="actions">
                    <button class="edit" onclick="editUser(${index})"><i class="fas fa-edit"></i></button>
                    <button class="delete" onclick="deleteUser(${index})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    });
    usersList.innerHTML = html;
}

// ===== OUVERTURE MODALE AJOUT =====
function openAddModal() {
    modalTitle.textContent = 'Ajouter un utilisateur';
    userId.value = '';
    nomInput.value = '';
    emailInput.value = '';
    roleSelect.value = 'joueur';
    passwordInput.value = '';
    modal.classList.add('active');
}

// ===== ÉDITION =====
window.editUser = (index) => {
    const users = JSON.parse(localStorage.getItem('users'));
    const user = users[index];
    modalTitle.textContent = 'Modifier un utilisateur';
    userId.value = index;
    nomInput.value = user.nom;
    emailInput.value = user.email;
    roleSelect.value = user.role;
    passwordInput.value = ''; // ne pas afficher le mot de passe existant
    modal.classList.add('active');
};

// ===== FERMETURE MODALE =====
window.closeModal = () => {
    modal.classList.remove('active');
};

// ===== SUPPRESSION =====
window.deleteUser = (index) => {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    let users = JSON.parse(localStorage.getItem('users'));
    users.splice(index, 1);
    localStorage.setItem('users', JSON.stringify(users));
    loadUsers();
};

// ===== GESTION DU FORMULAIRE =====
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const index = userId.value;
    let users = JSON.parse(localStorage.getItem('users')) || [];

    const newUser = {
        id: index === '' ? Date.now() : users[index].id,
        nom: nomInput.value,
        email: emailInput.value,
        role: roleSelect.value,
        dateCreation: index === '' ? new Date().toISOString() : users[index].dateCreation
    };

    // Pour la démo, on ne gère pas le mot de passe (sera géré avec authentification)

    if (index === '') {
        users.push(newUser);
    } else {
        users[index] = newUser;
    }
    localStorage.setItem('users', JSON.stringify(users));
    closeModal();
    loadUsers();
});

// ===== BOUTON D'AJOUT =====
document.getElementById('addUserBtn').addEventListener('click', openAddModal);

// ===== DÉCONNEXION =====
document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Déconnexion ?')) {
        window.location.href = '../../index.html';
    }
});

// ===== CHARGEMENT INITIAL =====
loadUsers();