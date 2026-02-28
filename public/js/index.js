// Initialisation du client Supabase
const supabaseUrl = 'https://fvkmjrkxkdqzjyaolqwf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2a21qcmt4a2Rxemp5YW9scXdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMjk3ODgsImV4cCI6MjA4NzgwNTc4OH0.AZ1IZXy72RHvZcjh9o2YhFcOhpA35W1EMeCJeA4XTVM';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Fonction pour charger les engagements depuis Supabase
async function loadEngagements() {
    const container = document.getElementById('engagementsContainer');
    if (!container) return;

    try {
        const { data: engagements, error } = await supabase
            .from('engagements')
            .select('titre, description');

        if (error) throw error;

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

// Fonction pour charger les rôles depuis Supabase
async function loadRoles() {
    const container = document.getElementById('rolesContainer');
    if (!container) return;

    try {
        const { data: roles, error } = await supabase
            .from('roles')
            .select('titre, description, lien, icone');

        if (error) throw error;

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

// Chargement au démarrage
document.addEventListener('DOMContentLoaded', () => {
    loadEngagements();
    loadRoles();
});