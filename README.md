# 🍹 Cocktail App

Application web de gestion de cocktails (React + Express + MariaDB), support d'une chaîne **DevSecOps** complète sur GitHub Actions.

> L'infrastructure (Terraform, Ansible, déploiements) vit dans le dépôt **cocktail-infra**.
> Le pas-à-pas complet de mise en place est dans `GUIDE-MISE-EN-PLACE.md`.

## Développer en local

```bash
npm install                 # installe les hooks Git (Lefthook : Gitleaks + commitlint)
cp .env.example .env        # puis remplacer les "change-me"
docker compose -f compose.dev.yml up -d --build   # MariaDB + API sur http://localhost:12000
cd frontend && npm ci && npm run dev              # front sur http://localhost:5173
```

## Le cycle de vie d'une évolution

| Étape | Déclencheur | Ce qui se passe |
|---|---|---|
| Commit | `git commit` | Gitleaks, ESLint, convention de commit (Lefthook) |
| Feature → `develop` | Pull request | Gitleaks, Hadolint, ESLint, Jest, Cypress, SonarCloud, CodeQL, Trivy, Dependency Review |
| Ouverture de release | Workflow manuel *Release - Ouvrir une release* | Version calculée depuis les commits, branche `release/x.y.z`, CHANGELOG, PR vers `main` |
| Push sur `release/x.y.z` | Automatique | Build, scan Trivy, push GHCR `sha-xxxxxxx`, SBOM, signature Cosign → staging (Terraform + Ansible) → DAST ZAP |
| Merge `release/x.y.z` → `main` | Approbation de l'environnement `production` | Même image promue en `vx.y.z`, déployée en prod, tag + GitHub Release, staging détruit, back-merge vers `develop` |

## Conventional Commits

| Préfixe | Effet sur la version |
|---|---|
| `fix: ...` | 1.2.0 → 1.2.1 |
| `feat: ...` | 1.2.0 → 1.3.0 |
| `feat!: ...` ou `BREAKING CHANGE:` | 1.2.0 → 2.0.0 |
| `chore:`, `docs:`, `ci:`, `test:`, `refactor:` | aucune |

## API

Spécification OpenAPI : `backend/openapi/openapi.json` (utilisée par ZAP pour le DAST).
Derrière Traefik, l'API est servie sous `https://<domaine>/api`.
