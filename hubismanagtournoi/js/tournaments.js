// Fonctions communes pour le module gestionnaire de tournois

async function loadTournamentsList() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_tournaments')
        .select(`
            id,
            name,
            description,
            start_date,
            end_date,
            location,
            registration_code,
            prize_pool,
            stream_url,
            requires_first_pas,
            has_agreed_to_rules,
            type:type_id (name, label),
            sport:sport_id (name)
        `)
        .eq('is_active', true)
        .order('start_date', { ascending: true });
    if (error) throw error;
    return data.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        start_date: t.start_date,
        end_date: t.end_date,
        location: t.location,
        registration_code: t.registration_code,
        prize_pool: t.prize_pool,
        stream_url: t.stream_url,
        requires_first_pas: t.requires_first_pas,
        has_agreed_to_rules: t.has_agreed_to_rules,
        type: t.type.name,
        typeLabel: t.type.label,
        sport: t.sport.name
    }));
}

async function loadSportsList() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_sports')
        .select('id, name')
        .order('name');
    if (error) throw error;
    return data;
}

async function loadTournamentTypes() {
    const { data, error } = await supabaseGestionTournoi
        .from('gestionnairetournoi_types')
        .select('id, name, label');
    if (error) throw error;
    return data;
}