// Vérifier que le CDN Supabase est chargé
if (typeof window.supabase === 'undefined') {
    document.getElementById('publicPostsFeed').innerHTML = '<p style="color:red;">❌ CDN Supabase non chargé. Vérifiez la balise script dans HTML.</p>';
    throw new Error('CDN Supabase manquant');
}

console.log("✅ CDN Supabase trouvé");
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    const feed = document.getElementById('publicPostsFeed');
    if (!feed) {
        console.error("❌ Élément 'publicPostsFeed' introuvable");
        return;
    }
    try {
        const { data, error } = await supabase.from('posts').select('*').limit(1);
        if (error) throw error;
        feed.innerHTML = '<p style="color:green;">✅ Connexion Supabase réussie !</p>';
    } catch (e) {
        console.error("❌ Erreur Supabase :", e);
        feed.innerHTML = '<p style="color:red;">❌ ' + e.message + '</p>';
    }
}
testConnection();