// ===== INITIALISATION SUPABASE =====
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Fonction pour sauvegarder un affilié
async function saveAffiliate(data) {
    const { error } = await supabaseClient
        .from('affiliates')
        .insert([data]);
    if (error) {
        console.error('Erreur sauvegarde affilié:', error);
        alert('Erreur lors de l\'enregistrement. Veuillez réessayer.');
        return false;
    }
    return true;
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('affiliationForm');
    const resultArea = document.getElementById('resultArea');
    const affLinkSpan = document.getElementById('affLink');
    const copyBtn = document.getElementById('copyBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const type = document.querySelector('input[name="type"]:checked')?.value;
        const pays = document.getElementById('pays').value;
        const nom = document.getElementById('nom').value.trim();
        const telephone = document.getElementById('telephone').value.trim();
        const paiement = document.getElementById('paiement').value;

        if (!pays || !nom || !telephone || !paiement) {
            alert('Veuillez remplir tous les champs obligatoires.');
            return;
        }

        // Générer un identifiant unique pour cet affilié
        const affiliateId = 'aff_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);

        const affiliate = {
            id: affiliateId,
            type,
            pays,
            nom,
            telephone,
            paiement,
            count: 0,
            valide: false,
            created_at: new Date().toISOString()
        };

        const success = await saveAffiliate(affiliate);
        if (!success) return;

        // Construire le lien d'affiliation
        const baseUrl = window.location.origin + '/hubisoccer1st';
        let targetPath;
        if (type === 'joueur') {
            targetPath = '/premier-pas.html';
        } else {
            targetPath = '/e-marketing-hubisoccer.html';
        }
        const link = `${baseUrl}${targetPath}?ref=${encodeURIComponent(affiliateId)}`;

        // Afficher le lien
        affLinkSpan.textContent = link;
        resultArea.style.display = 'block';
    });

    copyBtn.addEventListener('click', () => {
        const link = affLinkSpan.textContent;
        if (link) {
            navigator.clipboard.writeText(link).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copié !';
                setTimeout(() => {
                    copyBtn.innerHTML = '<i class="fas fa-copy"></i> Copier';
                }, 2000);
            }).catch(err => {
                alert('Erreur de copie : ' + err);
            });
        }
    });
});

// Fonction FAQ (à garder)
function toggleFaq(element) {
    const answer = element.nextElementSibling;
    const icon = element.querySelector('i');
    element.classList.toggle('active');
    if (answer.classList.contains('show')) {
        answer.classList.remove('show');
    } else {
        answer.classList.add('show');
    }
    if (icon) {
        icon.style.transform = element.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0)';
    }
}
