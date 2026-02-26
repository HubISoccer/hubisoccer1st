// Configuration de l'API (à remplacer par l'URL de ton backend)
const API_BASE_URL = 'https://ton-backend.com';

async function loadEngagements() {
    const container = document.getElementById('engagementsContainer');
    if (!container) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/engagements`);
        if (!response.ok) throw new Error('Erreur réseau');
        const engagements = await response.json();
        let html = '';
        engagements.forEach(e => {
            html += `
                <div class="concept-card">
                    <h3>${e.titre}</h3>
                    <p>${e.description}</p>
                </div>
            `;
        });
        container.innerHTML = html || '<p>Aucun engagement.</p>';
    } catch (error) {
        console.error('Erreur chargement engagements:', error);
        container.innerHTML = '<p>Erreur de chargement.</p>';
    }
}

async function loadRoles() {
    const container = document.getElementById('rolesContainer');
    if (!container) return;
    try {
        const response = await fetch(`${API_BASE_URL}/api/roles`);
        if (!response.ok) throw new Error('Erreur réseau');
        const roles = await response.json();
        let html = '';
        roles.forEach(r => {
            html += `
                <a href="${r.lien}" class="role-card">
                    <div class="role-icon">${r.icone}</div>
                    <h3>${r.titre}</h3>
                    <p>${r.description}</p>
                </a>
            `;
        });
        container.innerHTML = html || '<p>Aucun rôle.</p>';
    } catch (error) {
        console.error('Erreur chargement rôles:', error);
        container.innerHTML = '<p>Erreur de chargement.</p>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadEngagements();
    loadRoles();
});