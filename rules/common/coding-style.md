# Coding Style

- **Immutability**: Never mutate existing objects or arrays. Always return new objects (`{...obj, key: val}`, `[...arr, item]`, `map/filter/reduce` over `push/splice`).
- **File size**: 200-800 lines max. Extract utilities/modules when approaching the limit.
- **Function size**: < 50 lines. Single responsibility. Extract helpers for anything longer.
- **Nesting depth**: Max 2-3 levels. Early returns over nested if-else chains.
- **No hardcoded values**: All config, credentials, URLs, and magic numbers go in constants, env vars, or config files. Never inline.
- **Naming**: Descriptive names. No abbreviations unless universally understood (id, url, ctx).
- **No dead code**: Remove unused variables, imports, functions, and commented-out blocks before committing.
