document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('affilieLoginForm');

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const loginId = document.getElementById('loginId').value.trim();
        const password = document.getElementById('password').value.trim();

        // Récupérer la liste des affiliés
        let affiliates = JSON.parse(localStorage.getItem('affiliates')) || [];

        // Chercher par ID (pour l'instant, on ne gère pas l'email)
        const affiliate = affiliates.find(a => a.id === loginId);

        if (affiliate) {
            // Simuler une vérification de mot de passe (à remplacer par un vrai système)
            if (password === 'password123') {
                sessionStorage.setItem('currentAffiliate', JSON.stringify(affiliate));
                window.location.href = 'affilie-dashboard.html';
            } else {
                alert('Mot de passe incorrect. (Utilisez "password123" pour tester)');
            }
        } else {
            alert('ID d\'affilié non trouvé. Vérifiez votre identifiant.');
        }
    });
});