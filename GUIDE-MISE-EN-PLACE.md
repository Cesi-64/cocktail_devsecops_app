# Guide de mise en place — Chaîne DevSecOps « Cocktail »

> **Public** : étudiants bac+5. **Durée** : une journée pour la mise en place, puis un cycle complet « feature → production » en moins d'une heure.
> Suivez les étapes **dans l'ordre** : chacune s'appuie sur la précédente. Chaque commande est à copier telle quelle, en remplaçant uniquement les valeurs `EN_MAJUSCULES`.

---

## Sommaire

0. [Vue d'ensemble](#0-vue-densemble)
1. [Prérequis](#1-prérequis)
2. [L'organisation GitHub et les deux dépôts](#2-lorganisation-github-et-les-deux-dépôts)
3. [Les hooks locaux et l'exercice de la fuite de secret](#3-les-hooks-locaux-et-lexercice-de-la-fuite-de-secret)
4. [La GitHub App « cocktail-bot »](#4-la-github-app--cocktail-bot-)
5. [Azure : le bootstrap](#5-azure--le-bootstrap)
6. [Clés, mots de passe, variables et secrets](#6-clés-mots-de-passe-variables-et-secrets)
7. [Les environnements GitHub](#7-les-environnements-github)
8. [SonarCloud](#8-sonarcloud)
9. [Protéger les branches et activer la sécurité GitHub](#9-protéger-les-branches-et-activer-la-sécurité-github)
10. [Publier la version v1 du dépôt infra](#10-publier-la-version-v1-du-dépôt-infra)
11. [Premier lancement de l'infrastructure](#11-premier-lancement-de-linfrastructure)
12. [Premier cycle complet : de la feature à la production](#12-premier-cycle-complet--de-la-feature-à-la-production)
13. [Exploiter la supervision](#13-exploiter-la-supervision)
14. [Exercices de reprise après sinistre](#14-exercices-de-reprise-après-sinistre)
15. [Coûts et nettoyage](#15-coûts-et-nettoyage)
16. [Dépannage](#16-dépannage)
17. [Annexes](#17-annexes)

---

## 0. Vue d'ensemble

### Deux dépôts, deux responsabilités

| Dépôt | Contenu | Qui le fait évoluer |
|---|---|---|
| `cocktail-app` | Code (backend, frontend), Dockerfiles, OpenAPI, CI applicative | L'équipe **produit** (les développeurs) |
| `cocktail-infra` | Terraform, Ansible, workflows de déploiement | L'équipe **plateforme** (les ops) |

La CI de `cocktail-app` **appelle** les workflows de `cocktail-infra` (workflows réutilisables, versionnés `@v1`). Le contrat est simple : l'appli fournit **des images référencées par digest et une version** ; l'infra sait **comment** les déployer.

### Le flux complet

```
 Poste dev        PR -> develop          release/x.y.z (push)                         PR release -> main (merge)
 ─────────        ─────────────          ─────────────────────                         ──────────────────────────
 Lefthook         Gitleaks               Build image (une seule fois !)                Approbation "production"
  ├ Gitleaks      Hadolint, ESLint        ├ Trivy image (bloquant)                      Déploiement de l'image TESTÉE
  ├ ESLint        Jest + Cypress          ├ Push GHCR  :sha-a1b2c3d                     Retag :v x.y.z (même digest)
  └ commitlint    SonarCloud (QG)         ├ SBOM CycloneDX + signature Cosign           Tag Git + GitHub Release
                  CodeQL                  ├ Staging : Terraform + Ansible               Destruction du staging
                  Trivy fs                ├ Déploiement PAR DIGEST                      PR de back-merge -> develop
                  Dependency Review       └ DAST OWASP ZAP (bloquant sur High)

 En continu : Dependabot (lundi 6h) · destruction du staging à 17h · sauvegarde MariaDB chaque nuit
              · test de restauration chaque mois · supervision Wazuh + Grafana/Loki/Prometheus
```

### Les trois machines Azure

| Machine | Taille | Rôle | Durée de vie |
|---|---|---|---|
| `vm-cocktail-staging` | B2s | Recette, DAST | Éphémère (détruite après la mise en prod et chaque jour à 17h) |
| `vm-cocktail-prod` | B2s | Production | Permanente, reconstructible par workflow |
| `vm-cocktail-monitoring` | B4ms | Wazuh (SIEM) + Grafana / Loki / Prometheus | Permanente, reconstructible par workflow |

### Les principes que vous allez mettre en œuvre

- **Shift left** : un secret ou une faille est arrêté le plus tôt possible (poste, puis PR).
- **Build once, Scan, Promote (BSP)** : l'image est construite **une seule fois**. La même image (même digest `sha256`) passe du staging à la production. On ne reconstruit jamais pour la prod.
- **Aucun secret dans le code** : les secrets vivent dans GitHub ; Azure est joint en **OIDC** (pas de mot de passe stocké) ; la VM de prod écrit ses sauvegardes via son **identité managée**.
- **Moindre privilège** : chaque job déclare ses `permissions` ; le SSH n'est ouvert qu'à l'IP du runner, le temps du job.
- **Supply chain** : SBOM + signature Cosign, **vérifiée** avant chaque déploiement.
- **Tout est code et reconstructible** : prod et supervision se recréent par un workflow (PRA), les sauvegardes sont testées chaque mois.

---

## 1. Prérequis

### Comptes

| Compte | Pourquoi | Remarque |
|---|---|---|
| **GitHub** (personnel) | Créer l'organisation | Activez la double authentification |
| **Abonnement Azure** | Héberger les VM | Il faut le rôle **Owner** de l'abonnement (création de rôles). Azure for Students convient |
| **Nom de domaine délégué à Azure DNS** | Certificats HTTPS, URLs | Une **zone Azure DNS** doit exister (ex : `cocktail.mon-ecole.fr`) |
| **SonarCloud** | Analyse de code | Connexion avec GitHub, gratuit pour les dépôts publics |

> **Vérifier la zone DNS** : la commande ci-dessous doit renvoyer les serveurs Azure (`ns1-XX.azure-dns.com`...). Sinon, demandez la délégation au propriétaire du domaine parent.
> ```bash
> dig NS VOTRE_DOMAINE +short
> ```

### Outils sur votre poste

| Outil | Version | Installation (Ubuntu / WSL) | macOS |
|---|---|---|---|
| Git | 2.40+ | `sudo apt install git` | `brew install git` |
| Node.js | 24 LTS | `curl -fsSL https://deb.nodesource.com/setup_24.x \| sudo bash - && sudo apt install nodejs` | `brew install node@24` |
| Docker | 27+ | https://docs.docker.com/engine/install/ubuntu/ | Docker Desktop |
| Azure CLI | 2.60+ | `curl -sL https://aka.ms/InstallAzureCLIDeb \| sudo bash` | `brew install azure-cli` |
| GitHub CLI | 2.50+ | https://github.com/cli/cli/blob/trunk/docs/install_linux.md | `brew install gh` |
| Gitleaks | 8.30+ | voir ci-dessous | `brew install gitleaks` |
| age | 1.1+ | `sudo apt install age` | `brew install age` |
| jq, openssl | — | `sudo apt install jq openssl` | `brew install jq` |

Installer Gitleaks sous Linux :

```bash
GL=8.30.1
curl -sSfL "https://github.com/gitleaks/gitleaks/releases/download/v${GL}/gitleaks_${GL}_linux_x64.tar.gz" | tar -xz gitleaks
sudo mv gitleaks /usr/local/bin/ && gitleaks version
```

Terraform et Ansible **ne sont pas nécessaires** sur votre poste : tout s'exécute dans GitHub Actions. (Ils restent utiles pour expérimenter, voir l'annexe.)

Connectez les CLI :

```bash
gh auth login          # choisir GitHub.com, HTTPS, navigateur
az login               # puis vérifier l'abonnement actif :
az account show --query "{nom:name, id:id}" -o table
# si besoin : az account set --subscription "NOM_OU_ID"
```

---

## 2. L'organisation GitHub et les deux dépôts

### 2.1 Choisir la visibilité des dépôts (important)

Plusieurs fonctions utilisées ici ne sont **gratuites que pour les dépôts publics** sur une organisation GitHub Free :

| Fonction | Dépôt public (Free) | Dépôt privé (Free) | Dépôt privé (Team / Education) |
|---|---|---|---|
| Secrets et variables d'**organisation** | ✅ | ❌ | ✅ |
| Environnements avec **approbation obligatoire** | ✅ | ❌ | ✅ |
| CodeQL, Dependency Review, Secret scanning | ✅ | ❌ | ❌ (GitHub Advanced Security payant) |

**Recommandation** : mettez les **deux dépôts en public**. Aucun secret n'est dans le code (c'est tout l'objet de la démarche), et l'école bénéficie de toute la sécurité GitHub. Si votre établissement a obtenu l'offre **GitHub Team gratuite via GitHub Education**, vous pouvez garder `cocktail-infra` privé.

### 2.2 Créer l'organisation

1. GitHub → avatar → **Your organizations** → **New organization** → plan **Free**.
2. Nom : par exemple `cocktail-groupe1`. **Notez-le exactement** (majuscules comprises) : c'est `MON_ORGA` dans la suite.

```bash
export ORG=MON_ORGA      # à garder dans votre terminal pour toute la suite
```

### 2.3 Créer les dépôts et pousser le code

Décompressez les deux archives fournies, puis :

```bash
gh repo create "$ORG/cocktail-app"   --public --description "Application Cocktail"
gh repo create "$ORG/cocktail-infra" --public --description "Infrastructure Cocktail (Terraform + Ansible)"
```

Remplacez les marqueurs `MON-ORGA` (nom de l'organisation GitHub) dans les workflows de l'appli :

```bash
cd cocktail-app
grep -rl "MON-ORGA/" .github | xargs sed -i "s#MON-ORGA/#${ORG}/#g"
grep -rn "uses: .*cocktail-infra" .github/workflows    # vérifier
```

> Sous macOS, utilisez `sed -i ''` au lieu de `sed -i`.

Premier commit et branches `main` + `develop` :

```bash
# Dans cocktail-app
git init -b main
git add .
git commit -m "chore: initialisation du projet"
git remote add origin "https://github.com/$ORG/cocktail-app.git"
git push -u origin main
git switch -c develop && git push -u origin develop

# Dans cocktail-infra
cd ../cocktail-infra
git init -b main
git add .
git commit -m "chore: initialisation de l'infrastructure"
git remote add origin "https://github.com/$ORG/cocktail-infra.git"
git push -u origin main
```

> Ce premier commit est fait **avant** l'installation des hooks (étape 3). C'est normal.

Faites de `develop` la branche par défaut de `cocktail-app` (les PR de features et de Dependabot la ciblent) :

```bash
gh repo edit "$ORG/cocktail-app" --default-branch develop
```

> **Attention** : dans `cocktail-infra`, la branche par défaut reste `main`. Les tâches planifiées (cron de 17h, test de restauration) ne s'exécutent que sur la branche par défaut.

### 2.4 Autoriser les workflows

Pour chacun des deux dépôts : **Settings → Actions → General**

- *Actions permissions* : **Allow all actions and reusable workflows**.
- *Workflow permissions* : **Read repository contents and packages permissions** (lecture seule par défaut ; chaque workflow demande explicitement ce dont il a besoin).
- Cochez **Allow GitHub Actions to create and approve pull requests** (utilisé par la release).

Si `cocktail-infra` est **privé**, ajoutez sur ce dépôt : **Settings → Actions → General → Access** → *Accessible from repositories in the 'MON_ORGA' organization*. Sans cela, `cocktail-app` ne peut pas appeler ses workflows.

---

## 3. Les hooks locaux et l'exercice de la fuite de secret

### 3.1 Installer Lefthook

Dans `cocktail-app` :

```bash
npm install             # installe Lefthook + commitlint et active les hooks Git
npx lefthook version
cat .git/hooks/pre-commit | head -5    # le hook est en place
```

Trois contrôles s'exécutent désormais **avant chaque commit** :

| Hook | Outil | Bloque si... |
|---|---|---|
| `pre-commit` | **Gitleaks** | un secret est présent dans les fichiers indexés |
| `pre-commit` | ESLint | le code front ne respecte pas les règles |
| `pre-commit` | garde-fou | un fichier `.env` est indexé |
| `commit-msg` | **commitlint** | le message ne suit pas les Conventional Commits |

### 3.2 Exercice : la fuite de secret

L'ancienne version du projet contenait un fichier `backend/.env` commité, avec le secret JWT et le mot de passe admin. Rejouons la scène :

```bash
git switch develop
# Fabrique une fausse clé AWS au bon format.
# (Le guide n'en contient pas en clair : sinon il serait lui-même bloqué par Gitleaks !)
FAKE_KEY="AKIA$(head -c 10 /dev/urandom | base32 | head -c 16)"
echo "module.exports = { awsKey: \"${FAKE_KEY}\" }" > backend/config-test.js
cat backend/config-test.js
git add backend/config-test.js
git commit -m "feat: ajoute la config"
```

Résultat attendu : **Gitleaks bloque le commit** (`aws-access-token`). Essayez maintenant un message non conforme :

```bash
git commit --allow-empty -m "ajout de truc"     # refusé par commitlint
git commit --allow-empty -m "chore: test"       # accepté
```

Puis contournez le hook, comme le ferait un développeur pressé :

```bash
git commit --no-verify -m "feat: ajoute la config"   # passe !
```

**Questions à se poser** :

1. Le hook local suffit-il ? (Non : `--no-verify` le contourne. C'est pourquoi la CI relance Gitleaks sur chaque PR, et pourquoi on active la *push protection* de GitHub, étape 9.)
2. Si ce commit avait été poussé, supprimer le fichier dans un commit suivant suffirait-il ? (Non : le secret reste dans l'**historique**. Il faut **révoquer et changer le secret** immédiatement, puis éventuellement réécrire l'historique avec `git filter-repo`. Révoquer passe toujours en premier.)

Annulez l'exercice :

```bash
git reset --hard HEAD~1 && git log --oneline -3
```

---

## 4. La GitHub App « cocktail-bot »

Pourquoi une GitHub App ?

- Le `GITHUB_TOKEN` d'un dépôt ne peut **pas lire un autre dépôt privé** ; or la CI de `cocktail-app` doit récupérer le code de `cocktail-infra`.
- Un push fait avec le `GITHUB_TOKEN` **ne déclenche pas** d'autres workflows (protection anti-boucle). Or l'ouverture de release pousse une branche `release/x.y.z` qui doit déclencher le déploiement du staging.
- Une App donne des jetons **éphémères** (1 h) aux droits précis, contrairement à un token personnel (PAT) lié à un humain.

### 4.1 Créer l'App

**Organisation → Settings → Developer settings → GitHub Apps → New GitHub App**

| Champ | Valeur |
|---|---|
| GitHub App name | `cocktail-bot-MON_ORGA` (doit être unique sur GitHub) |
| Homepage URL | `https://github.com/MON_ORGA` |
| Webhook | **décocher** *Active* |
| Repository permissions → **Contents** | Read and write |
| Repository permissions → **Pull requests** | Read and write |
| Repository permissions → **Metadata** | Read-only (automatique) |
| Where can this GitHub App be installed? | Only on this account |

Cliquez **Create GitHub App**, puis sur la page de l'App :

1. Notez le **Client ID** (commence par `Iv`).
2. **Private keys → Generate a private key** : un fichier `.pem` est téléchargé. **Ne le commitez jamais.**
3. **Install App** (menu de gauche) → installez-la sur l'organisation → *Only select repositories* → `cocktail-app` et `cocktail-infra`.

Vous enregistrerez ces deux valeurs à l'étape 6.

---

## 5. Azure : le bootstrap

Terraform stocke son **state** dans Azure, et la CI se connecte à Azure. Ces deux choses doivent exister **avant** le premier `terraform apply` : c'est le rôle du script `bootstrap/bootstrap.sh`, lancé **une seule fois** depuis votre poste.

Il crée :

| Ressource | Rôle |
|---|---|
| `rg-cocktail-shared` | Groupe de ressources partagé, **jamais détruit** |
| `sttfcocktailXXXXXX` / conteneur `tfstate` | State Terraform (versionné, suppression réversible 30 jours) |
| `stbkcocktailXXXXXX` / conteneur `mariadb` | Sauvegardes chiffrées (supprimées automatiquement après 30 jours). Il est **hors** de la prod pour survivre à sa perte |
| Application Entra ID `gh-cocktail-deployer` | Identité de la CI dans Azure |
| 5 identifiants fédérés OIDC | Un par couple dépôt / environnement GitHub : **aucun mot de passe Azure n'est stocké dans GitHub** |
| Rôles | Contributor (abonnement), accès au state, lecture des sauvegardes, délégation du droit d'écriture des sauvegardes à la VM de prod |

Lancez-le :

```bash
cd cocktail-infra
export GITHUB_ORG="$ORG"                        # nom EXACT de l'organisation
export DNS_ZONE=VOTRE_DOMAINE                   # ex : cocktail.mon-ecole.fr
export DNS_ZONE_RG=GROUPE_DE_LA_ZONE_DNS        # ex : rg-dns
./bootstrap/bootstrap.sh
```

Le script affiche à la fin un **tableau de variables** (`AZURE_CLIENT_ID`, `TFSTATE_STORAGE_ACCOUNT`...). **Copiez-le**, il sert à l'étape suivante.

> **Comment fonctionne l'OIDC ?** Au démarrage d'un job, GitHub délivre un jeton signé qui dit par exemple « je suis `repo:MON_ORGA/cocktail-app:environment:production` ». Azure a été configuré pour faire confiance à ce *sujet* précis et échange le jeton contre un accès temporaire. Si un autre dépôt, ou un autre environnement, présente un jeton, Azure refuse. Vérifiez les sujets créés :
> ```bash
> APP_ID=$(az ad app list --display-name gh-cocktail-deployer --query '[0].appId' -o tsv)
> az ad app federated-credential list --id "$APP_ID" --query "[].subject" -o tsv
> ```

---

## 6. Clés, mots de passe, variables et secrets

### 6.1 Pourquoi au niveau de l'organisation ?

Quand `cocktail-app` appelle un workflow de `cocktail-infra`, ce workflow s'exécute **avec les secrets de l'appelant** (`secrets: inherit`), pas avec ceux du dépôt infra. Les secrets sont donc déclarés **une seule fois au niveau de l'organisation**, partagés avec les deux dépôts uniquement.

Les secrets propres à un environnement portent un suffixe : `JWT_SECRET_STAGING`, `JWT_SECRET_PRODUCTION`... Le workflow `deploy.yml` choisit le bon selon l'environnement ciblé.

### 6.2 Générer les clés

Travaillez dans un dossier **hors des dépôts** (rien de tout cela ne doit être commité) :

```bash
mkdir -p ~/cocktail-secrets && cd ~/cocktail-secrets && chmod 700 .

# Clé SSH de déploiement (utilisée par Ansible depuis la CI)
ssh-keygen -t ed25519 -f cocktail-deploy -N "" -C "cocktail-ci"

# Clé de chiffrement des sauvegardes (age)
#  - la clé PUBLIQUE va sur la VM de prod : elle peut chiffrer, pas déchiffrer
#  - la clé PRIVÉE reste dans les secrets GitHub : seule la CI peut restaurer
age-keygen -o cocktail-backup.agekey
grep "public key" cocktail-backup.agekey
```

Déplacez aussi ici la clé privée de la GitHub App (fichier `.pem` téléchargé à l'étape 4).

> **Gardez une copie de `cocktail-backup.agekey` dans un coffre (gestionnaire de mots de passe).** Si elle est perdue, toutes les sauvegardes deviennent illisibles.

### 6.3 Créer les variables et les secrets

Les mots de passe sont générés en **hexadécimal** : pas de caractère spécial qui casserait un fichier `.env` ou une configuration.

```bash
cd ~/cocktail-secrets
REPOS=cocktail-app,cocktail-infra
setvar() { gh variable set "$1" --org "$ORG" --repos "$REPOS" --body "$2"; }
setsec() { gh secret set   "$1" --org "$ORG" --repos "$REPOS" --body "$2"; }
pw() { openssl rand -hex 24; }

# ---- Variables (non secrètes) : reprenez les valeurs affichées par le bootstrap
setvar AZURE_CLIENT_ID          "VALEUR_BOOTSTRAP"
setvar AZURE_TENANT_ID          "VALEUR_BOOTSTRAP"
setvar AZURE_SUBSCRIPTION_ID    "VALEUR_BOOTSTRAP"
setvar TFSTATE_RESOURCE_GROUP   "rg-cocktail-shared"
setvar TFSTATE_STORAGE_ACCOUNT  "VALEUR_BOOTSTRAP"
setvar BACKUP_STORAGE_ACCOUNT   "VALEUR_BOOTSTRAP"
setvar DOMAIN                   "VOTRE_DOMAINE"
setvar DNS_ZONE_RESOURCE_GROUP  "GROUPE_DE_LA_ZONE_DNS"
setvar ACME_EMAIL               "VOTRE_EMAIL"          # avertissements Let's Encrypt
setvar BOT_APP_CLIENT_ID        "Iv......"             # Client ID de la GitHub App
setvar SSH_PUBLIC_KEY           "$(cat cocktail-deploy.pub)"
setvar BACKUP_AGE_PUBLIC_KEY    "$(grep -o 'age1[a-z0-9]*' cocktail-backup.agekey)"
# Facultatif : votre IP (ou celle de l'école) autorisée en SSH permanent
# setvar ADMIN_SSH_CIDRS '["203.0.113.10/32"]'

# ---- Secrets : fichiers
gh secret set BOT_APP_PRIVATE_KEY    --org "$ORG" --repos "$REPOS" < cocktail-bot*.pem
gh secret set SSH_PRIVATE_KEY        --org "$ORG" --repos "$REPOS" < cocktail-deploy
gh secret set BACKUP_AGE_PRIVATE_KEY --org "$ORG" --repos "$REPOS" < cocktail-backup.agekey

# ---- Secrets : mots de passe générés
for e in STAGING PRODUCTION; do
  setsec "MARIADB_ROOT_PASSWORD_${e}" "$(pw)"
  setsec "MARIADB_PASSWORD_${e}"      "$(pw)"
  setsec "JWT_SECRET_${e}"            "$(openssl rand -hex 48)"
done
setsec WAZUH_REGISTRATION_PASSWORD "$(pw)"
setsec INGEST_PASSWORD             "$(pw)"

# ---- Mots de passe que VOUS utiliserez pour vous connecter : notez-les !
ADMIN_STAGING=$(pw); ADMIN_PROD=$(pw); GRAFANA=$(pw)
setsec FIRST_ADMIN_PASSWORD_STAGING    "$ADMIN_STAGING"
setsec FIRST_ADMIN_PASSWORD_PRODUCTION "$ADMIN_PROD"
setsec GRAFANA_ADMIN_PASSWORD          "$GRAFANA"
printf 'Admin appli staging : %s\nAdmin appli prod    : %s\nGrafana admin       : %s\n' \
  "$ADMIN_STAGING" "$ADMIN_PROD" "$GRAFANA"   # -> à copier dans votre gestionnaire de mots de passe

# Vérification
gh variable list --org "$ORG"
gh secret list --org "$ORG"
```

### 6.4 Récapitulatif

| Nom | Type | Utilisé par | Rôle |
|---|---|---|---|
| `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` | variable | infra | Connexion Azure OIDC |
| `TFSTATE_RESOURCE_GROUP`, `TFSTATE_STORAGE_ACCOUNT` | variable | infra | Emplacement du state Terraform |
| `BACKUP_STORAGE_ACCOUNT` | variable | infra | Compte des sauvegardes |
| `DOMAIN`, `DNS_ZONE_RESOURCE_GROUP` | variable | les deux | Zone DNS (staging.`DOMAIN`, app.`DOMAIN`...) |
| `ACME_EMAIL` | variable | infra | Let's Encrypt |
| `BOT_APP_CLIENT_ID` / `BOT_APP_PRIVATE_KEY` | variable / secret | les deux | GitHub App |
| `SSH_PUBLIC_KEY` / `SSH_PRIVATE_KEY` | variable / secret | infra | Clé de déploiement Ansible |
| `BACKUP_AGE_PUBLIC_KEY` / `BACKUP_AGE_PRIVATE_KEY` | variable / secret | infra | Chiffrement / déchiffrement des sauvegardes |
| `ADMIN_SSH_CIDRS` | variable (facultative) | infra | SSH permanent depuis une IP |
| `MARIADB_ROOT_PASSWORD_*`, `MARIADB_PASSWORD_*` | secret | infra | Base de données |
| `JWT_SECRET_*` | secret | infra | Signature des jetons de l'API |
| `FIRST_ADMIN_PASSWORD_*` | secret | les deux | Compte `admin@admin.admin` (et login du DAST) |
| `WAZUH_REGISTRATION_PASSWORD` | secret | infra | Inscription des agents Wazuh |
| `INGEST_PASSWORD` | secret | infra | Authentification des agents Alloy vers Loki / Prometheus |
| `GRAFANA_ADMIN_PASSWORD` | secret | infra | Compte `admin` de Grafana |
| `SONAR_TOKEN` | secret (dépôt app) | app | SonarCloud (étape 8) |

---

## 7. Les environnements GitHub

Un environnement GitHub regroupe des **règles de protection** (qui peut approuver un déploiement) et apparaît dans l'identité OIDC (`...:environment:production`).

### 7.1 Dépôt `cocktail-app`

**Settings → Environments → New environment**

| Environnement | Configuration |
|---|---|
| `staging` | Aucune protection |
| `production` | **Required reviewers** : vous (et/ou l'enseignant). Cochez **Prevent self-review** si vous êtes plusieurs. *Deployment branches* : **No restriction** |

C'est cette approbation qui matérialise le « si on valide » : le workflow de mise en production s'arrête et attend qu'une personne habilitée clique sur **Approve and deploy**.

### 7.2 Dépôt `cocktail-infra`

Créez `staging`, `production` et `monitoring`, sans protection (seuls les membres de l'organisation peuvent lancer ces workflows). Vous pouvez ajouter des *Required reviewers* sur `production` et `monitoring` pour encadrer les reprises après sinistre.

---

## 8. SonarCloud

1. Allez sur https://sonarcloud.io → **Log in with GitHub**.
2. **+ → Analyze new project → Import an organization** → choisissez `MON_ORGA` → plan gratuit. Notez la **clé d'organisation SonarCloud** (souvent le nom en minuscules) : c'est `ORGA_SONAR`.
3. Le dépôt contient **deux** projets (backend et frontend) : **+ → Analyze new project → Create a project manually**, deux fois :

   | Display name | Project key |
   |---|---|
   | Cocktail backend | `ORGA_SONAR_cocktail-back` |
   | Cocktail frontend | `ORGA_SONAR_cocktail-front` |

4. Dans **chaque** projet : **Administration → Analysis Method** → **désactivez Automatic Analysis** (sinon l'analyse de la CI est refusée).
5. Dans chaque projet : **Administration → New Code** → *Previous version*.
6. **My Account → Security → Generate Tokens** → type *Global Analysis Token* → copiez-le.

Puis :

```bash
cd cocktail-app
SONAR_ORG=ORGA_SONAR
sed -i "s/MON-ORGA-SONAR/${SONAR_ORG}/g" backend/sonar-project.properties frontend/sonar-project.properties

gh secret set SONAR_TOKEN -R "$ORG/cocktail-app" --body "LE_TOKEN"
# Les PR de Dependabot n'ont pas accès aux secrets Actions : il leur faut le leur
gh secret set SONAR_TOKEN -R "$ORG/cocktail-app" --app dependabot --body "LE_TOKEN"

git switch develop
git add -A && git commit -m "ci: configure SonarCloud" && git push
```

---

## 9. Protéger les branches et activer la sécurité GitHub

### 9.1 Fonctions de sécurité (dépôt `cocktail-app`, puis `cocktail-infra`)

**Settings → Advanced Security** (ou *Code security*) :

| Fonction | Action |
|---|---|
| Dependency graph | Activer |
| Dependabot alerts | Activer |
| Dependabot security updates | Activer |
| Secret Protection / Secret scanning | Activer |
| **Push protection** | **Activer** : GitHub refuse un `git push` contenant un secret, même si le hook local a été contourné |
| Code scanning → CodeQL | **Ne PAS activer le « Default setup »** : le dépôt a son propre `codeql.yml` (les deux entrent en conflit) |

### 9.2 Rulesets (dépôt `cocktail-app`)

**Settings → Rules → Rulesets → New branch ruleset**. Les noms de checks n'apparaissent dans la liste qu'après une première exécution : revenez compléter ces règles après la première PR (étape 12.1).

**Ruleset `develop`** — cible : `develop`

- ✅ Restrict deletions, ✅ Block force pushes
- ✅ Require a pull request before merging (0 approbation suffit pour démarrer)
- ✅ Require status checks to pass :
  `Secrets (Gitleaks)` · `Lint (ESLint, Hadolint)` · `Tests backend (Jest)` · `Tests frontend (Cypress)` · `SonarCloud (backend)` · `SonarCloud (frontend)` · `Trivy (fichiers du dépôt)` · `Dependency Review` · `CodeQL (javascript-typescript)`

**Ruleset `main`** — cible : `main`

- ✅ Restrict deletions, ✅ Block force pushes
- ✅ Require a pull request before merging — **1 approbation**
- ✅ Require status checks to pass : les mêmes que `develop` **+ `DAST (OWASP ZAP)`**. Une release dont le DAST a trouvé une alerte High ne peut donc pas être mergée.

**Ruleset `release`** — cible : `release/**`

- ✅ Block force pushes

**Settings → General → Pull Requests** :

- ✅ Allow merge commits — ✅ Allow squash merging — *Default commit message* (squash) : **Pull request title**
- ❌ Automatically delete head branches (les branches `release/*` servent d'historique)

> **Règle d'équipe** : le titre d'une PR de feature suit les Conventional Commits (`feat(front): ...`), car c'est lui qui devient le message du commit squashé, et c'est ce message qui calcule la version. Les PR de **release** et de **back-merge** se mergent avec un **merge commit** (pas de squash) pour conserver l'historique commun entre `main` et `develop`.

---

## 10. Publier la version v1 du dépôt infra

`cocktail-app` appelle `cocktail-infra/...@v1`. Créez ce tag :

```bash
cd cocktail-infra
git tag v1 && git push origin v1
```

À chaque évolution **compatible** du dépôt infra (correction d'un rôle Ansible...), on déplace le tag :

```bash
git tag -f v1 && git push -f origin v1
```

Une évolution **incompatible** (une entrée de workflow renommée) donne un nouveau tag `v2`. L'équipe produit migre `@v1` → `@v2` quand elle est prête : c'est exactement la gestion de version d'une API.

---

## 11. Premier lancement de l'infrastructure

Ordre impératif : **supervision → production**. Les agents de la prod ont besoin que la supervision existe pour s'inscrire.

### 11.1 La supervision (25 à 35 minutes)

`cocktail-infra` → **Actions → Supervision - Provisionner / Reprise → Run workflow** (branche `main`, *reenroll_agents* décoché).

Ou en ligne de commande :

```bash
gh workflow run "Supervision - Provisionner / Reprise" -R "$ORG/cocktail-infra"
gh run watch -R "$ORG/cocktail-infra"
```

Ce que fait le workflow :

1. **Terraform** crée `rg-cocktail-monitoring`, la VM B4ms, son IP publique, le NSG (80, 443, 1514, 1515 ouverts ; **22 fermé**) et les enregistrements DNS `grafana`, `wazuh`, `loki`, `metrics`, `monitoring`. Il génère l'inventaire Ansible.
2. La CI **ouvre le port 22 pour la seule IP du runner**.
3. **Ansible** : durcissement, Docker, Wazuh tout-en-un (le plus long), Traefik + Grafana + Loki + Prometheus.
4. La CI **referme le port 22**.

Vérifications :

- `https://grafana.VOTRE_DOMAINE` → utilisateur `admin`, mot de passe `GRAFANA_ADMIN_PASSWORD`.
- `https://wazuh.VOTRE_DOMAINE` → utilisateur `admin`. Le mot de passe a été généré par l'installeur Wazuh. Récupérez-le **sans ouvrir le SSH**, grâce à l'agent Azure présent sur la VM :

```bash
az vm run-command invoke -g rg-cocktail-monitoring -n vm-cocktail-monitoring \
  --command-id RunShellScript \
  --scripts "tar -O -xf /root/wazuh-install-files.tar wazuh-install-files/wazuh-passwords.txt | grep -A1 \"'admin'\"" \
  --query "value[0].message" -o tsv
```

### 11.2 La production (10 minutes)

**Actions → Production - Provisionner / Reprise → Run workflow** : *version* vide, *restore* décoché.

La VM est créée et préparée (Docker, agent Wazuh, Alloy, sauvegarde quotidienne à 2h30), mais **l'application n'y est pas encore** : elle arrivera à la première mise en production (étape 12). `https://app.VOTRE_DOMAINE` ne répond donc pas encore, c'est normal.

Vérifications :

- Dashboard Wazuh → **Agents** : `cocktail-prod` est *active*.
- Grafana → **Explore** → source *Loki* → requête `{env="production"}` : les logs système de la prod arrivent.

---

## 12. Premier cycle complet : de la feature à la production

### 12.1 Une feature (développeur)

```bash
cd cocktail-app
git switch develop && git pull
git switch -c feat/footer
```

Modifiez `frontend/src/components/public/Footer.jsx` : remplacez `El footer` par `© Cocktail App`. Puis :

```bash
git add frontend/src/components/public/Footer.jsx
git commit -m "feat(front): affiche un vrai pied de page"
git push -u origin feat/footer
gh pr create --base develop --title "feat(front): affiche un vrai pied de page" --body "Premier cycle DevSecOps"
gh pr checks --watch
```

Observez dans l'onglet **Checks** de la PR : Gitleaks, Hadolint, ESLint, Jest, Cypress, SonarCloud (commentaire de la Quality Gate), CodeQL, Trivy, Dependency Review. Les résultats de sécurité arrivent dans **Security → Code scanning**.

Une fois tout vert : complétez les rulesets de l'étape 9.2 avec les noms de checks, puis :

```bash
gh pr merge --squash
```

### 12.2 Ouvrir la release (responsable de release)

```bash
gh workflow run "Release - Ouvrir une release" -R "$ORG/cocktail-app"
gh run watch -R "$ORG/cocktail-app"
```

git-cliff lit les commits depuis la dernière version : `feat` → nouvelle version mineure. Pour la toute première release, la version est `v0.1.0`. Résultat : une branche `release/0.1.0` avec son `CHANGELOG.md`, et une PR `release: v0.1.0` vers `main`.

### 12.3 Le staging et le DAST (automatique)

Le push de la branche `release/0.1.0` déclenche **Release - Staging** :

| Job | Ce qu'il fait |
|---|---|
| Image backend / frontend | Build **une fois**, Trivy (bloquant sur CRITICAL/HIGH corrigeables), push `ghcr.io/MON_ORGA/cocktail-app/backend:sha-xxxxxxx`, SBOM CycloneDX, signature et attestation Cosign |
| Infra staging | `cocktail-infra/staging-up.yml@v1` : Terraform crée la VM, Ansible la prépare |
| Déploiement staging | `cocktail-infra/deploy.yml@v1` : vérifie les signatures Cosign, déploie **par digest** |
| DAST (OWASP ZAP) | Baseline sur le front, scan **actif et authentifié** de l'API à partir de `backend/openapi/openapi.json` |

À observer :

- `https://staging.VOTRE_DOMAINE` : le navigateur signale un **certificat non reconnu**. C'est voulu : le staging utilise l'autorité de **test** de Let's Encrypt, car il est recréé chaque jour et épuiserait le quota de vrais certificats.
- Le **résumé** du job DAST (tableau des alertes) et l'artefact `zap-reports` (rapports HTML).
- Une **issue** `DAST v0.1.0 : N alerte(s) Medium` si ZAP a trouvé des alertes Medium. Elles ne bloquent pas, mais doivent être traitées.

> **Pourquoi le scan actif seulement en staging ?** Il envoie de vraies attaques (injections, suppressions...). Il peut supprimer des données, y compris le compte admin. On ne le lance **jamais** contre la production.

Une correction pendant la recette ? On la fait sur la branche de release (via une PR vers `release/0.1.0`) : chaque push reconstruit, rescanne et redéploie le staging.

### 12.4 La mise en production (validation humaine)

1. Faites approuver la PR `release: v0.1.0` (ruleset `main`), puis mergez-la en **merge commit** :
   ```bash
   gh pr merge release/0.1.0 --merge
   ```
2. Le workflow **Release - Production** démarre, retrouve les digests **testés** (tag `sha-<dernier commit de la release>`), puis **s'arrête** : *Waiting for review*.
3. **Actions → le run → Review deployments → production → Approve and deploy.**
4. Le workflow :
   - vérifie la signature Cosign et déploie sur `https://app.VOTRE_DOMAINE` ;
   - ajoute le tag `v0.1.0` aux **mêmes** images (aucune reconstruction : vérifiez dans GHCR que `v0.1.0` et `sha-xxxxxxx` pointent vers le même digest) ;
   - crée le tag Git `v0.1.0` et la **GitHub Release** avec le changelog ;
   - **détruit le staging** ;
   - ouvre la PR de **back-merge** `main → develop`. Mergez-la en merge commit.

Connectez-vous à la prod avec `admin@admin.admin` / `FIRST_ADMIN_PASSWORD_PRODUCTION`.

### 12.5 Autoriser le dépôt infra à lire les images (pour la reprise après sinistre)

Lors d'une reprise, c'est `cocktail-infra` (et non `cocktail-app`) qui tire les images. Donnez-lui l'accès, une fois les paquets créés :

`https://github.com/orgs/MON_ORGA/packages` → `cocktail-app/backend` → **Package settings → Manage Actions access → Add repository** → `cocktail-infra` → rôle **Read**. Idem pour `cocktail-app/frontend`.

---

## 13. Exploiter la supervision

### 13.1 Grafana (logs et métriques)

**Explore → Loki**, quelques requêtes utiles :

| Besoin | Requête LogQL |
|---|---|
| Logs de l'API en prod | `{env="production", service="backend"}` |
| Erreurs, tous environnements | `{source="docker"} \|= "Error"` |
| Accès HTTP vus par Traefik | `{env="production", service="traefik"}` |
| Tentatives SSH | `{job="auth"} \|= "Failed"` |
| Le passage de ZAP sur le staging | `{env="staging", service="traefik"} \|= "ZAP"` |

**Métriques machines** : **Dashboards → New → Import** → ID `1860` (*Node Exporter Full*) → source *Prometheus*.

### 13.2 Wazuh (sécurité)

| Menu | Ce qu'on y voit |
|---|---|
| Agents | `cocktail-prod`, et `cocktail-staging` quand il existe |
| Configuration Assessment | Score CIS de durcissement d'Ubuntu 24.04 : chaque échec est une piste d'amélioration du rôle Ansible `common` |
| Vulnerability Detection | CVE des paquets installés sur les VM |
| Threat Hunting | Événements de sécurité : authentifications, `sudo`, modifications de fichiers sensibles |

### 13.3 Pourquoi les agents « poussent »

Les VM supervisées n'ouvrent **aucun port** pour la supervision. Alloy **envoie** logs et métriques en HTTPS, avec authentification, vers `loki.` et `metrics.` ; l'agent Wazuh se connecte au manager sur 1514. Traefik n'expose que les URL d'envoi (`/loki/api/v1/push`, `/api/v1/write`), jamais les interfaces de requête.

---

## 14. Exercices de reprise après sinistre

Deux notions à chiffrer pendant ces exercices :

- **RPO** (*Recovery Point Objective*) : combien de données peut-on perdre ? Ici, au pire **24 h** (sauvegarde quotidienne à 2h30).
- **RTO** (*Recovery Time Objective*) : combien de temps pour revenir en service ? Mesurez-le !

### 14.1 Perte totale de la production

1. Créez quelques cocktails dans l'application de prod.
2. Forcez une sauvegarde maintenant (sinon vous restaurerez celle de la nuit) :
   ```bash
   az vm run-command invoke -g rg-cocktail-production -n vm-cocktail-prod \
     --command-id RunShellScript --scripts "/usr/local/bin/cocktail-backup.sh" \
     --query "value[0].message" -o tsv
   ```
3. Notez la version en production : `gh release list -R "$ORG/cocktail-app" -L 1`.
4. **Le sinistre** (lancez un chronomètre) :
   ```bash
   az group delete -n rg-cocktail-production --yes --no-wait
   ```
   > `prevent_destroy` dans Terraform protège contre un `terraform destroy`, **pas** contre une suppression faite directement dans Azure. Piste d'amélioration : un **verrou Azure** (`az lock create --lock-type CanNotDelete ...`).
5. Attendez la fin de la suppression : `az group exists -n rg-cocktail-production` → `false`.
6. **La reprise** : Actions → **Production - Provisionner / Reprise** → *version* = `v0.1.0`, *restore* = ✅.
7. Terraform recrée tout ce qui manque (nouvelle IP publique, **DNS mis à jour automatiquement**), Ansible reprépare la VM, la version est redéployée **depuis ses images signées**, la dernière sauvegarde est **déchiffrée sur le runner** puis restaurée.
8. Arrêtez le chronomètre : c'est votre RTO. Vos cocktails sont-ils revenus ?

### 14.2 Perte de la supervision

```bash
az group delete -n rg-cocktail-monitoring --yes
```

Puis **Supervision - Provisionner / Reprise** avec *reenroll_agents* = ✅. Le nouveau manager Wazuh ne connaît pas les anciens agents : la réinscription forcée reconnecte celui de la prod. L'historique des logs et des métriques est perdu : c'est un choix (assumé et documenté) de ce TP.

### 14.3 Le test de restauration automatique

Le 1er de chaque mois, **Sauvegardes - Test de restauration** crée un staging, y déploie la dernière version de prod, y restaure la dernière sauvegarde, contrôle qu'elle n'est pas vide, puis détruit le staging. Lancez-le à la main une fois pour le voir fonctionner.

> **Question** : restaurer les données de production sur le staging est-il acceptable dans une vraie entreprise (RGPD) ? Quelles alternatives ? (Anonymisation, environnement de restauration isolé...)

---

## 15. Coûts et nettoyage

Ordres de grandeur (France Central, à vérifier sur https://azure.microsoft.com/pricing/calculator/) :

| Ressource | Disponibilité | Coût mensuel approximatif |
|---|---|---|
| VM supervision B4ms | permanente | ~120-150 € |
| VM production B2s | permanente | ~30-40 € |
| VM staging B2s | quelques heures par release | quelques euros |
| IP publiques, disques, stockage, DNS | — | ~10-15 € |

Économiser :

```bash
# Éteindre (et ne plus payer le calcul de) la supervision le soir et le week-end
az vm deallocate -g rg-cocktail-monitoring -n vm-cocktail-monitoring
az vm start      -g rg-cocktail-monitoring -n vm-cocktail-monitoring
```

Tout supprimer en fin de module :

```bash
az group delete -n rg-cocktail-staging    --yes --no-wait 2>/dev/null
az group delete -n rg-cocktail-production --yes --no-wait
az group delete -n rg-cocktail-monitoring --yes --no-wait
az group delete -n rg-cocktail-shared     --yes --no-wait    # state + SAUVEGARDES : définitif !
for r in staging app grafana wazuh loki metrics monitoring; do
  az network dns record-set a delete -g "$DNS_ZONE_RG" -z "$DNS_ZONE" -n "$r" --yes 2>/dev/null
done
az ad app delete --id "$(az ad app list --display-name gh-cocktail-deployer --query '[0].appId' -o tsv)"
```

---

## 16. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| `AADSTS70021: No matching federated identity record found` | Le sujet OIDC ne correspond pas | Vérifiez la casse exacte de l'organisation et des dépôts, et que le job déclare bien un `environment` (voir 5) |
| `workflow was not found` sur `cocktail-infra/...@v1` | Tag `v1` absent ou dépôt infra privé non partagé | Étape 10, et l'option *Access* de l'étape 2.4 |
| `Resource not accessible by integration` à la création de la release | Permissions de la GitHub App ou App non installée sur le dépôt | Étape 4 (Contents + Pull requests en écriture) |
| La branche `release/x.y.z` est créée mais rien ne se déclenche | Push fait avec le `GITHUB_TOKEN` | Le workflow doit utiliser le token de l'App (`BOT_APP_*` bien définis) |
| `Aucun commit feat/fix depuis ...` | Seulement des `chore`/`docs` depuis la dernière version | Normal : rien à livrer |
| SonarCloud : *You are running CI analysis while Automatic Analysis is enabled* | Analyse automatique active | Étape 8, point 4 |
| Les PR Dependabot échouent sur SonarCloud | Pas de secret Dependabot | `gh secret set SONAR_TOKEN --app dependabot ...` |
| `cosign verify` échoue au déploiement | Image construite ailleurs que par `_build-image.yml` sur une branche `release/*` | C'est la protection qui joue : ne déployez que des images issues du pipeline |
| Le test de fumée échoue en prod juste après la création | Certificat Let's Encrypt pas encore délivré, DNS pas encore propagé | Relancez le job ; vérifiez `dig app.VOTRE_DOMAINE` |
| `too many certificates already issued` | Quota Let's Encrypt atteint (trop de reprises le même jour) | Attendre, ou passer temporairement `acme_ca_server` à `acme_ca_staging` dans `inventories/production/group_vars/all/main.yml` |
| `Error acquiring the state lock` | Deux workflows Terraform simultanés, ou un run interrompu | Attendez la fin de l'autre run ; sinon `az storage blob lease break --auth-mode login --account-name <TFSTATE_SA> -c tfstate -b <env>.tfstate` |
| L'installation Wazuh échoue | VM trop petite, ou version indisponible | Vérifiez B4ms et `wazuh_version` dans `ansible/playbooks/group_vars/all.yml` |
| Le DAST bloque la release | Au moins une alerte High | Lisez `zap-reports`, corrigez sur la branche de release, ou documentez un faux positif dans une règle ZAP |
| `manage_agents` n'a rien supprimé | L'agent staging n'était pas inscrit | Sans conséquence (étape non bloquante) |

Pour déboguer un job : relancez-le avec **Re-run jobs → Enable debug logging**.

---

## 17. Annexes

### 17.1 Tous les workflows

| Dépôt | Workflow | Déclencheur | Rôle |
|---|---|---|---|
| app | `ci.yml` | PR vers develop, release/*, main | Gitleaks, lint, tests, Sonar, Trivy, Dependency Review |
| app | `codeql.yml` | PR, push develop/main, lundi | SAST CodeQL (JS + workflows) |
| app | `release-start.yml` | manuel | Version semver, `release/x.y.z`, CHANGELOG, PR |
| app | `release.yml` | push `release/**` | Build/scan/sign, staging, déploiement, DAST |
| app | `_build-image.yml` | appelé par `release.yml` | Une image : build, Trivy, push, SBOM, Cosign |
| app | `promote.yml` | merge d'une PR `release/*` → main | Approbation, prod, retag semver, release, staging-down, back-merge |
| app | `dependabot.yml` | lundi 6h (Paris) | Mises à jour npm, Docker, Actions |
| infra | `staging-up.yml` | appelé / manuel | Terraform + Ansible du staging |
| infra | `deploy.yml` | appelé / reprise | Vérification Cosign, déploiement par digest, test de fumée |
| infra | `staging-down.yml` | appelé / **17h chaque jour** / manuel | Retrait de l'agent Wazuh, `terraform destroy` |
| infra | `prod-provision.yml` | manuel | Première installation et reprise de la prod (+ restauration) |
| infra | `monitoring-provision.yml` | manuel | Première installation et reprise de la supervision |
| infra | `restore-test.yml` | 1er du mois / manuel | Test de restauration de bout en bout |
| infra | `ci.yml` | PR, push main | `terraform fmt/validate`, Checkov, ansible-lint, Gitleaks |
| infra | `dependabot.yml` | lundi 6h (Paris) | Mises à jour Actions et providers Terraform |

### 17.2 Travailler sur l'infra depuis son poste (facultatif)

Avec Terraform (≥ 1.9) et Ansible installés, et `az login` fait :

```bash
cd cocktail-infra
export ARM_SUBSCRIPTION_ID=$(az account show --query id -o tsv)
terraform -chdir=terraform/staging init \
  -backend-config="resource_group_name=rg-cocktail-shared" \
  -backend-config="storage_account_name=VOTRE_TFSTATE_SA"
# en local, l'authentification passe par az login : retirez temporairement use_oidc
terraform -chdir=terraform/staging plan \
  -var domain=VOTRE_DOMAINE -var dns_zone_resource_group=RG_DNS \
  -var ssh_public_key="$(cat ~/cocktail-secrets/cocktail-deploy.pub)"
```

Après le premier `terraform init`, **commitez les fichiers `.terraform.lock.hcl`** de chaque stack : ils figent les versions exactes des providers.

### 17.3 Failles connues de l'API (exercices)

L'application d'origine contient des failles réelles. Les outils de la chaîne doivent vous aider à les trouver, puis à les corriger **par le cycle complet** (feature → PR → release → prod) :

1. N'importe quel utilisateur connecté peut modifier ou supprimer **n'importe quel** utilisateur (`/users/:id`) : contrôle d'accès défaillant (OWASP A01).
2. `PATCH /users/:id` accepte tous les champs, y compris `password`, qui est alors enregistré **sans hachage**.
3. Certaines erreurs renvoient l'objet d'erreur brut de la base au client.
4. Le compte `admin@admin.admin` est créé au démarrage avec un mot de passe venant de l'environnement : comment forcer son changement ?

### 17.4 Pour aller plus loin

- **Réseau privé** : VNet peering entre les VM et la supervision, Wazuh et Loki non exposés sur Internet, accès d'administration par Azure Bastion.
- **Azure Key Vault** pour les secrets applicatifs, lus au démarrage par l'identité managée.
- **Verrous Azure** (`CanNotDelete`) sur la prod et le groupe partagé.
- **Métriques DORA** : brancher Apache DevLake sur GitHub (fréquence de déploiement, délai, taux d'échec, rework rate).
- **Kubernetes** : remplacer Docker Compose par AKS, Argo CD (GitOps) et Kyverno pour refuser les images non signées à l'admission.
- **Renovate** à la place de Dependabot, **Socket** pour détecter les paquets npm malveillants.
