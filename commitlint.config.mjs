// Conventional Commits : la version (semver) est calculée automatiquement à partir des commits.
//   feat: ...        -> version mineure  (1.2.0 -> 1.3.0)
//   fix: ...         -> version corrective (1.2.0 -> 1.2.1)
//   feat!: ... ou "BREAKING CHANGE:" dans le corps -> version majeure (1.2.0 -> 2.0.0)
//   chore/docs/ci/test/refactor/style/perf/build: pas de nouvelle version à elles seules
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [1, 'always', ['back', 'front', 'ci', 'deps', 'docker', 'docs', 'release']],
    'subject-case': [0],
  },
}
