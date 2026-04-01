// ===== tournament-rules.js =====
// Récupération de l'ID du tournoi dans l'URL
const urlParams = new URLSearchParams(window.location.search);
const tournamentId = urlParams.get('id');

if (!tournamentId) {
    window.location.href = 'accueil_hubisgst.html';
}

let currentUser = null;
let tournamentData = null;
let signatureAccepted = false;

// ===== ÉLÉMENTS DOM =====
const tournamentNameEl = document.getElementById('tournamentName');
const tournamentDatesEl = document.getElementById('tournamentDates');
const rulesContent = document.getElementById('rulesContent');
const signatureBlock = document.getElementById('signatureBlock');
const acceptBtn = document.getElementById('acceptRulesBtn');
const clearBtn = document.getElementById('clearSignatureBtn');
const canvas = document.getElementById('signatureCanvas');
let ctx = null;
let drawing = false;

// ===== INITIALISATION DU CANVAS =====
function initCanvas() {
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    drawing = true;
    const pos = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
}

function draw(e) {
    if (!drawing) return;
    e.preventDefault();
    const pos = getCanvasCoordinates(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
}

function stopDrawing() {
    drawing = false;
    ctx.beginPath();
}

function getCanvasCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    return { x, y };
}

function clearCanvas() {
    if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

// ===== CHARGEMENT DES DONNÉES =====
async function loadTournamentRules() {
    try {
        const { data, error } = await window.supabaseAuthPrive
            .from('gestionnairetournoi_tournaments')
            .select('id, name, start_date, end_date, rules, has_agreed_to_rules')
            .eq('id', tournamentId)
            .single();

        if (error) throw error;
        tournamentData = data;

        tournamentNameEl.textContent = data.name;
        const start = formatDate(data.start_date);
        const end = formatDate(data.end_date);
        tournamentDatesEl.textContent = `${start} - ${end}`;

        // Afficher le règlement
        if (data.rules) {
            rulesContent.innerHTML = `<div class="rules-text">${escapeHtml(data.rules).replace(/\n/g, '<br>')}</div>`;
        } else {
            rulesContent.innerHTML = '<div class="rules-text">Aucun règlement spécifique pour ce tournoi.</div>';
        }

        // Vérifier si l'utilisateur a déjà accepté
        if (currentUser) {
            // On vérifie dans la table des inscriptions (ou une table dédiée) si l'utilisateur a déjà accepté
            const { data: player } = await window.supabaseAuthPrive
                .from('gestionnairetournoi_players')
                .select('id')
                .eq('user_id', currentUser.id)
                .maybeSingle();
            if (player) {
                const { data: reg } = await window.supabaseAuthPrive
                    .from('gestionnairetournoi_registrations')
                    .select('has_agreed_to_rules')
                    .eq('tournament_id', tournamentId)
                    .eq('player_id', player.id)
                    .maybeSingle();
                if (reg && reg.has_agreed_to_rules) {
                    signatureAccepted = true;
                    signatureBlock.style.display = 'none';
                    showToast('Vous avez déjà accepté le règlement.', 'info');
                } else {
                    signatureBlock.style.display = 'block';
                }
            } else {
                signatureBlock.style.display = 'block';
            }
        } else {
            // Utilisateur non connecté, on affiche un message d'incitation à se connecter
            rulesContent.innerHTML += '<div class="rules-warning">Veuillez vous connecter pour accepter le règlement.</div>';
            signatureBlock.style.display = 'none';
        }

    } catch (err) {
        console.error(err);
        rulesContent.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erreur lors du chargement du règlement.</p></div>';
    }
}

// ===== ACCEPTATION DU RÈGLEMENT =====
async function acceptRules() {
    if (!currentUser) {
        window.location.href = '../auth/login.html';
        return;
    }
    if (!tournamentData) return;

    // Vérifier si une signature a été tracée
    if (canvas) {
        const signatureData = canvas.toDataURL();
        if (signatureData === canvas.toDataURL()) {
            // Vérifier si le canvas est vide (seuil simple)
            const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            let isBlank = true;
            for (let i = 0; i < imgData.length; i += 4) {
                if (imgData[i] !== 255 || imgData[i+1] !== 255 || imgData[i+2] !== 255) {
                    isBlank = false;
                    break;
                }
            }
            if (isBlank) {
                showToast('Veuillez signer avant d’accepter.', 'warning');
                return;
            }
        }
    }

    // Récupérer l'ID du joueur
    const { data: player, error: playerError } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_players')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

    if (playerError || !player) {
        showToast('Vous n’avez pas encore de fiche joueur. Veuillez vous inscrire d’abord.', 'error');
        return;
    }

    // Mettre à jour l'inscription (ou créer une entrée si elle n'existe pas)
    const { data: existingReg } = await window.supabaseAuthPrive
        .from('gestionnairetournoi_registrations')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('player_id', player.id)
        .maybeSingle();

    if (existingReg) {
        const { error } = await window.supabaseAuthPrive
            .from('gestionnairetournoi_registrations')
            .update({ has_agreed_to_rules: true })
            .eq('id', existingReg.id);
        if (error) {
            showToast('Erreur lors de l’enregistrement', 'error');
            return;
        }
    } else {
        const { error } = await window.supabaseAuthPrive
            .from('gestionnairetournoi_registrations')
            .insert({
                tournament_id: tournamentId,
                player_id: player.id,
                has_agreed_to_rules: true,
                status: 'pending'
            });
        if (error) {
            showToast('Erreur lors de l’enregistrement', 'error');
            return;
        }
    }

    // Sauvegarder la signature (optionnel : stocker dans une table signatures)
    // Ici on pourrait sauvegarder l'image, mais pour l'instant on se contente de marquer l'acceptation.
    showToast('Règlement accepté !', 'success');
    signatureBlock.style.display = 'none';
    window.location.href = `tournament-details.html?id=${tournamentId}`;
}

// ===== INITIALISATION =====
document.addEventListener('DOMContentLoaded', async () => {
    // Récupérer l'utilisateur connecté
    const { data: { user } } = await window.supabaseAuthPrive.auth.getUser();
    currentUser = user;

    await loadTournamentRules();
    if (canvas) {
        initCanvas();
        if (clearBtn) {
            clearBtn.addEventListener('click', clearCanvas);
        }
    }
    if (acceptBtn) {
        acceptBtn.addEventListener('click', acceptRules);
    }
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'accueil_hubisgst.html';
        });
    }
});
