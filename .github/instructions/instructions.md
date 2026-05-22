ALWAYS use generated client apis to call the backend REST APIs. Dont forget to regenerate when backend code changed.

Never write fetch functions in the frontend, always generate from openapi backend specs!

check in package.json how to generate client apis in doubt

follow the concept of DRY! and use existing code patterns

mind that we use ui\src\i18n\translations

if bun causes issues, use bun install --force 

before push, ALWAYS lint and build.