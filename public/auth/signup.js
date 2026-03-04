// ===== CONFIGURATION SUPABASE =====
const SUPABASE_URL = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
// Utiliser un nom différent pour éviter les conflits
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== LISTE DES PAYS =====
const countries = [
    "Bénin", "Burkina Faso", "Burundi", "Cameroun", "Cap-Vert", "République centrafricaine", "Comores", "Congo",
    "République démocratique du Congo", "Côte d'Ivoire", "Djibouti", "Égypte", "Érythrée", "Eswatini", "Éthiopie",
    "Gabon", "Gambie", "Ghana", "Guinée", "Guinée-Bissau", "Guinée équatoriale", "Kenya", "Lesotho", "Liberia",
    "Libye", "Madagascar", "Malawi", "Mali", "Maroc", "Maurice", "Mauritanie", "Mozambique", "Namibie", "Niger",
    "Nigeria", "Ouganda", "Rwanda", "Sahara occidental", "Sao Tomé-et-Principe", "Sénégal", "Seychelles",
    "Sierra Leone", "Somalie", "Soudan", "Soudan du Sud", "Tanzanie", "Tchad", "Togo", "Tunisie", "Zambie",
    "Zimbabwe"
].sort();

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Remplir le select des pays
    const countrySelect = document.getElementById('country');
    if (countrySelect) {
        countries.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            countrySelect.appendChild(option);
        });
    }

    // Gestion des boutons de rôle
    const roleOptions = document.querySelectorAll('.role-option');
    roleOptions.forEach(opt => {
        opt.addEventListener('click', function() {
            roleOptions.forEach(o => o.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('role').value = this.dataset.role;
        });
    });
});

// ===== FONCTION POUR AFFICHER/MASQUER LE MOT DE PASSE =====
window.togglePassword = function(id) {
    const input = document.getElementById(id);
    const icon = input.parentElement.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
};

// ===== VALIDATION DU MOT DE PASSE =====
function validatePassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#€&_\-+?!*])[A-Za-z\d@#€&_\-+?!*]{8,}$/;
    return regex.test(password);
}

// ===== VÉRIFICATION DE L'UNICITÉ DE L'ID HUB =====
async function checkHubIdUniqueness(hubId) {
    if (!hubId) return true;
    const { data, error } = await supabaseClient
        .from('player_profiles')
        .select('hub_id')
        .eq('hub_id', hubId)
        .maybeSingle();
    if (error) throw error;
    return !data;
}

// ===== SOUMISSION DU FORMULAIRE =====
document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const role = document.getElementById('role').value;
    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const hubIdInput = document.getElementById('hubId').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const country = document.getElementById('country').value;
    const address = document.getElementById('address').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const acceptTerms = document.getElementById('acceptTerms').checked;

    if (!fullname || !email || !phone || !country || !address || !password || !confirmPassword) {
        alert('Tous les champs obligatoires doivent être remplis.');
        return;
    }

    if (password !== confirmPassword) {
        alert('Les mots de passe ne correspondent pas.');
        return;
    }

    if (!validatePassword(password)) {
        alert('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial parmi @#€&_-+?!*');
        return;
    }

    if (!acceptTerms) {
        alert('Vous devez accepter les conditions d\'utilisation.');
        return;
    }

    try {
        if (hubIdInput) {
            const isUnique = await checkHubIdUniqueness(hubIdInput);
            if (!isUnique) {
                alert('Cet ID HubISoccer est déjà utilisé.');
                return;
            }
        }

        const { data: authData, error: authError } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: { nom_complet: fullname }
            }
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Erreur lors de la création du compte.");

        const hubId = hubIdInput || ('HUB' + Date.now().toString(36).toUpperCase());

        const { error: profileError } = await supabaseClient
            .from('player_profiles')
            .insert([{
                user_id: authData.user.id,
                hub_id: hubId,
                nom_complet: fullname,
                role: role,
                phone: phone,
                country: country,
                address: address,
                avatar_url: 'img/user-default.jpg'
            }]);

        if (profileError) throw profileError;

        alert('Inscription réussie ! Vous pouvez maintenant vous connecter.');
        window.location.href = 'login.html';

    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors de l\'inscription : ' + error.message);
    }
});