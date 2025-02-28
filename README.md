# AI Chat App 🤖

Une application de chat moderne et élégante permettant d'interagir avec différents modèles d'IA (GPT-4, Claude, Mistral), avec support PWA pour une installation sur desktop. L'application n'est actuellement pas vraiment responsive pour mobile, son objectif est d'être utilisée pour développer, donc uniquement sur PC.

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

## ⚠️ A savoir ⚠️

- L'application supporte actuellement que GPT-4 en mode Streaming. Les autres IA et la désactivation du Streaming arriveront plus tard.
- Pour utiliser une image, vous pouvez copier une image et faire CTRL + V dans une conversation. Sinon, vous pouvez aussi drag & drop l'image. Ensuite, l'image sera automatiquement analysée et vous pourrez la mentionner dans la conversation en utilisant "@" afin que l'IA puisse voir les images que vous voulez.
- Il est possible d'utiliser la webcam ou notre position, qui seront mises sous forme d'images dans la conversation.
- Dans l'onglet Projet, vous pouvez créer plusieurs conversations pour le même projet. Vous pouvez définir un "prompt system" que l'IA verra automatiquement dans toutes les conversations du projet concernée. Il est aussi possible de donner l'accès à la PWA au dosssier local de votre projet pour programmer directement depuis l'application. (Dans le futur, les IA pourront développer directement sur votre machine, dans le dossier qui a été partagé)

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


3. Lancez le serveur de développement :
```bash
npm run dev
```

4. Ajoutez une clé d'API dans les paramètres de l'application.
Actuellement, seul GPT fonctionne, et uniquement en mode Streaming activé.

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
2. Cliquez sur l'icône d'installation dans la barre d'adresse

### Sur Android

1. Ouvrez l'application dans Chrome
2. Appuyez sur l'icone permettant d'ajouter le site en PWA

## 📄 License

MIT License - voir le fichier [LICENSE](LICENSE) pour plus de détails.