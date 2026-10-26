# Mise en ligne automatique sur OVH

À chaque mise à jour de `main`, la CI construit le site et, **seulement si tous les tests
sont verts**, l'envoie par FTP dans le dossier `www` de l'hébergement OVH. Les visiteurs
voient la nouvelle version au chargement suivant ; l'app installée affiche « Nouvelle
version disponible ».

Tant que les accès FTP ne sont pas enregistrés, l'étape de mise en ligne est simplement
ignorée (la CI reste verte).

## Configuration (une seule fois)

### 1. Récupérer les accès FTP chez OVH

Espace client OVH → **Web Cloud → Hébergements → ton hébergement → onglet FTP-SSH** :

- **Serveur FTP**, par exemple `ftp.cluster031.hosting.ovh.net` (sans `ftp://`) ;
- **Login principal**, par exemple `yarnesu` ;
- **Mot de passe** : si tu ne l'as plus, bouton « … » à droite du login → « Modifier le
  mot de passe ».

### 2. Les enregistrer dans GitHub

Sur github.com/camillewz/yarnest : **Settings → Secrets and variables → Actions →
onglet Secrets → New repository secret**. Créer trois secrets, un par un :

| Name               | Secret              |
| ------------------ | ------------------- |
| `OVH_FTP_SERVER`   | le serveur FTP      |
| `OVH_FTP_USER`     | le login principal  |
| `OVH_FTP_PASSWORD` | le mot de passe FTP |

Les noms doivent être recopiés exactement. Les secrets restent illisibles, y compris
pour toi, une fois enregistrés.

Facultatif : si le site n'est pas dans `www` (voir Multisite chez OVH), créer dans l'onglet
**Variables** une variable `OVH_FTP_DIR` avec le bon dossier.

### 3. Lancer la première mise en ligne

**Actions → CI → Run workflow** (branche `main`) → **Run workflow**. Après 6 à 8 minutes
(tests compris), le job **deploy** passe au vert : le site est en ligne sur
https://yarnest.app.

## Bon à savoir

- Le dossier `www` est **remplacé** par le site : tout autre fichier qui s'y trouve est
  supprimé (par exemple la page d'attente OVH).
- Les fichiers sont envoyés dans un ordre qui évite les versions à moitié en ligne :
  ressources d'abord, puis `index.html` et le service worker, puis nettoyage.
- Pour relancer une mise en ligne sans changement de code : **Actions → CI → Run workflow**.
- Si le job **deploy** échoue sur « Envoyer sur OVH » : vérifier les trois secrets (une
  espace en trop suffit à bloquer) et que le mot de passe FTP n'a pas été changé chez OVH.
