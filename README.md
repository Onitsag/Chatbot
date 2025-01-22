# AI Chat App 🤖

Une application de chat moderne et élégante permettant d'interagir avec différents modèles d'IA (GPT-4, Claude, Mistral), avec support PWA pour une installation sur desktop et mobile.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## ✨ Fonctionnalités

- 💬 Chat avec différents modèles d'IA (GPT-4, Claude, Mistral)
- 📱 Progressive Web App (PWA) installable
- 🌙 Thème sombre natif
- 📂 Gestion de projets et fichiers
- 🖼️ Support des images avec description automatique
- 💾 Sauvegarde locale des conversations
- ⚡ Streaming des réponses en temps réel
- 📍 Fonctionne hors-ligne
- 🔄 Mise à jour automatique

## 🚀 Installation

1. Clonez le repository :
```bash
git clone https://github.com/Onitsag/Chatbot
cd Chatbot
```

2. Installez les dépendances :
```bash
npm install
```

3. Créez un fichier `.env` à la racine du projet avec vos clés API :
```env
VITE_OPENAI_API_KEY=votre_clé_openai
VITE_ANTHROPIC_API_KEY=votre_clé_anthropic
VITE_MISTRAL_API_KEY=votre_clé_mistral
```

4. Lancez le serveur de développement :
```bash
npm run dev
```

## 🏗️ Build et déploiement

1. Créez une version de production :
```bash
npm run build
```

2. Testez la version de production localement :
```bash
npm run preview
```

## 📱 Installation PWA

### Sur Desktop (Chrome, Edge, etc.)

1. Ouvrez l'application dans votre navigateur
2. Cliquez sur l'icône d'installation dans la barre d'adresse (🔽)
3. Suivez les instructions d'installation

### Sur Android

1. Ouvrez l'application dans Chrome
2. Appuyez sur "Ajouter à l'écran d'accueil"
3. Suivez les instructions d'installation

### Sur iOS

1. Ouvrez l'application dans Safari
2. Appuyez sur le bouton Partager (📤)
3. Sélectionnez "Sur l'écran d'accueil"
4. Confirmez l'installation

## 🧪 Test de la PWA

Pour tester les fonctionnalités PWA :

1. **Mode hors-ligne** :
   - Ouvrez les DevTools (F12)
   - Allez dans l'onglet "Network"
   - Activez "Offline"
   - L'application devrait continuer à fonctionner

2. **Mise en cache** :
   - Les ressources sont automatiquement mises en cache
   - Les appels API sont mis en cache pour 24h
   - Vérifiez dans DevTools > Application > Cache Storage

3. **Mise à jour** :
   - L'application se met à jour automatiquement
   - Une notification apparaît lors des mises à jour

## 🛠️ Technologies utilisées

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Zustand (State management)
- Marked (Markdown parsing)
- Lucide React (Icons)
- PWA (vite-plugin-pwa)

## 📝 Configuration

### Manifest PWA

Le fichier `manifest.json` configure l'apparence et le comportement de l'application installée :

```json
{
  "name": "AI Chat App",
  "short_name": "AI Chat",
  "description": "Application de chat avec différentes IAs",
  "theme_color": "#0A0A0A",
  "background_color": "#0A0A0A",
  "display": "standalone"
}
```

### Service Worker

Le service worker est généré automatiquement par `vite-plugin-pwa` et gère :
- La mise en cache des ressources
- Le fonctionnement hors-ligne
- Les stratégies de cache pour les API
- Les mises à jour automatiques

## 📄 License

MIT License - voir le fichier [LICENSE](LICENSE) pour plus de détails.