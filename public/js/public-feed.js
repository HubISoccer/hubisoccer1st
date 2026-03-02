// ===== TEST DE BASE =====
console.log("✅ public-feed.js est chargé !");
const feed = document.getElementById('publicPostsFeed');
if (feed) {
    feed.innerHTML = '<p style="color:blue; font-size:1.2rem;">✅ Le fichier JavaScript fonctionne.</p>';
} else {
    console.error("❌ Élément 'publicPostsFeed' introuvable dans le HTML");
}