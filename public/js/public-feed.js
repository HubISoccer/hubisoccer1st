console.log("🚀 Test de connexion à Supabase...");
const supabaseUrl = 'https://wxlpcflanihqwumjwpjs.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4bHBjZmxhbmlocXd1bWp3cGpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyNzcwNzAsImV4cCI6MjA4Nzg1MzA3MH0.i1ZW-9MzSaeOKizKjaaq6mhtl7X23LsVpkkohc_p6Fw';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    const feed = document.getElementById('publicPostsFeed');
    const { data, error } = await supabase.from('posts').select('*').limit(1);
    if (error) {
        console.error('❌ Erreur Supabase:', error);
        feed.innerHTML = '<p style="color:red;">❌ Erreur de connexion : ' + error.message + '</p>';
    } else {
        console.log('✅ Connexion Supabase réussie !', data);
        feed.innerHTML = '<p style="color:green;">✅ Connexion Supabase réussie ! Aucun post trouvé.</p>';
    }
}
testConnection();
