# Bankin-Test

Consomme l'API de [Bankin](https://github.com/bankin-engineering/challenge-backend-connectors).

Donne le résultat dans un fichier result.json à la racine du projet.

Configuration au début d'index.js : 

```javascript
const server_url = 'http://localhost:3000';
const credentials = {
    login: 'BankinUser',
    password: '12345678',
    clientId: 'BankinClientId',
    clientSecret: 'secret'
};
```

## Lancement

```bash
npm install

npm start
```

ou

```bash
npm install

node index.js
```

## Améliorations du serveur possibles

- Supprimer les doublons dans les transactions directement dans la data du serveur
- Revoir la route pour récupérer les comptes (renvoi le mauvais nombre de page et donc beaucoup de comptes en doublon au passage)
- Bien vérifié les numéros de compte dans les transactions (manque un 0 pour le compte '0000000013')
