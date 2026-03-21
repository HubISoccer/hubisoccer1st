// ===== MODALE PROFIL =====
let currentModalData = null;

async function loadProfileModalData() {
    const user = (await window.supabaseAuthPrive.auth.getUser()).data.user;
    if (!user) return null;

    // Charger les données de base depuis profiles
    const { data: profile, error: profileError } = await window.supabaseAuthPrive
        .from('profiles')
        .select('full_name, bio, country, phone, email')
        .eq('id', user.id)
        .single();
    if (profileError) console.error(profileError);

    // Charger les données spécifiques depuis player_cv
    const { data: cv, error: cvError } = await window.supabaseAuthPrive
        .from('player_cv')
        .select('data')
        .eq('player_id', user.id)
        .maybeSingle();
    if (cvError) console.error(cvError);

    return { profile, cvData: cv?.data || {} };
}

function openProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) {
        console.error('Modal non trouvée');
        return;
    }

    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    // Remplir les champs
    loadProfileModalData().then(({ profile, cvData }) => {
        currentModalData = { profile, cvData };

        // Champs communs
        document.getElementById('modalBio').value = profile?.bio || '';
        document.getElementById('modalNationality').value = profile?.country || '';

        // Champs du CV
        document.getElementById('modalPosition').value = cvData.position || '';
        document.getElementById('modalHeight').value = cvData.taille || '';
        document.getElementById('modalWeight').value = cvData.poids || '';
        document.getElementById('modalPreferredFoot').value = cvData.piedFort || '';
        document.getElementById('modalClub').value = cvData.club || '';
        document.getElementById('modalLicenseNumber').value = cvData.license_number || '';
    });
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

async function saveProfileModal() {
    const user = (await window.supabaseAuthPrive.auth.getUser()).data.user;
    if (!user) return;

    // Récupérer les valeurs
    const bio = document.getElementById('modalBio').value.trim();
    const nationality = document.getElementById('modalNationality').value.trim();

    const position = document.getElementById('modalPosition').value.trim();
    const height = parseInt(document.getElementById('modalHeight').value, 10);
    const weight = parseInt(document.getElementById('modalWeight').value, 10);
    const preferredFoot = document.getElementById('modalPreferredFoot').value;
    const club = document.getElementById('modalClub').value.trim();
    const licenseNumber = document.getElementById('modalLicenseNumber').value.trim();

    // 1. Mettre à jour profiles (bio, country)
    const { error: profileError } = await window.supabaseAuthPrive
        .from('profiles')
        .update({
            bio: bio || null,
            country: nationality || null
        })
        .eq('id', user.id);
    if (profileError) {
        alert('Erreur mise à jour profil : ' + profileError.message);
        return;
    }

    // 2. Récupérer ou créer l'entrée player_cv
    const { data: existing, error: selectError } = await window.supabaseAuthPrive
        .from('player_cv')
        .select('id, data')
        .eq('player_id', user.id)
        .maybeSingle();

    let cvData = existing?.data || {};
    cvData = {
        ...cvData,
        position,
        taille: height,
        poids: weight,
        piedFort: preferredFoot,
        club,
        license_number: licenseNumber
    };

    if (existing) {
        const { error: updateError } = await window.supabaseAuthPrive
            .from('player_cv')
            .update({ data: cvData })
            .eq('id', existing.id);
        if (updateError) {
            alert('Erreur mise à jour CV : ' + updateError.message);
            return;
        }
    } else {
        const { error: insertError } = await window.supabaseAuthPrive
            .from('player_cv')
            .insert([{ player_id: user.id, data: cvData }]);
        if (insertError) {
            alert('Erreur création CV : ' + insertError.message);
            return;
        }
    }

    alert('Informations mises à jour !');
    closeProfileModal();
    // Optionnel : recharger la page pour voir les changements
    location.reload();
}

// Attacher les événements (à appeler après le chargement du DOM)
function initProfileModal() {
    const modal = document.getElementById('profileModal');
    if (!modal) return;

    // Fermeture en cliquant sur le bouton X ou en dehors
    const closeBtn = modal.querySelector('.close-modal');
    if (closeBtn) closeBtn.addEventListener('click', closeProfileModal);
    window.addEventListener('click', (e) => {
        if (e.target === modal) closeProfileModal();
    });

    const saveBtn = document.getElementById('saveProfileBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveProfileModal);
}
