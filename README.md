# BidNow — Mini-Place de Marché aux Enchères

Ce projet est une application d'enchères en temps réel développée dans le cadre du cours **R401 Programmation Web Avancée**.

## Stratégie d'Authentification
Nous avons choisi l'**Option A : JWT (JSON Web Tokens)**. 
- Les tokens sont générés lors de la connexion/inscription.
- Ils sont stockés dans le `localStorage` du navigateur.
- Ils sont utilisés pour authentifier les requêtes REST via un middleware `requireAuth` et les connexions WebSockets via un middleware Socket.IO.

## Installation et Lancement

### Prérequis
- Node.js (v18+)
- MongoDB (local ou distant)

### 1. Configuration
Copiez le fichier `.env.example` en `.env` dans le dossier `backend/` et ajustez les variables si nécessaire :
```bash
cp .env.example backend/.env
```

### 2. Backend
```bash
cd backend
npm install
npm start
```
Le serveur écoute sur le port `3000`.

### 3. Frontend
```bash
cd frontend
npm install
npm run dev
```
L'application est accessible sur `http://localhost:5173`.

## Fonctionnalités
- **Inscription / Connexion** : Sécurisées par hachage `bcryptjs`.
- **Mise en vente** : Création d'enchères avec durée personnalisée.
- **Enchères en direct** : Mise à jour instantanée des prix via WebSockets.
- **Clôture automatique** : Les enchères se terminent précisément à l'heure prévue.
- **Suppression** : Un utilisateur peut supprimer ses propres enchères terminées.

## Scénario de Démonstration
1. Créer deux comptes (ex: Alice et Bob).
2. Se connecter avec Alice et mettre un objet en vente (ex: "Appareil Photo", Prix: 50, Durée: 1 min).
3. Se connecter avec Bob dans un autre navigateur (ou onglet privé) et ouvrir l'enchère d'Alice.
4. Bob place une enchère à 60. Alice voit la mise à jour instantanément.
5. Attendre la fin du décompte : l'enchère passe en "Ended", Bob est déclaré vainqueur.
- **Recherche** par titre via une regex insensible à la casse (`{ title: { $regex: q, $options: "i" } }`).
- **Rate-limit** sur `'place-bid'` côté serveur (1 mise / seconde / utilisateur) pour éviter le spam.

---
