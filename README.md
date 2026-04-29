# Gliese

SvelteKit app with a Phaser-based JRPG vertical slice at `/game`.

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
bun x sv@0.15.1 create --template minimal --types ts --add prettier eslint vitest="usages:unit,component" playwright tailwindcss="plugins:none" sveltekit-adapter="adapter:cloudflare+cfTarget:workers" mcp="ide:claude-code,opencode,other+setup:remote" --install bun Gliese
```

## Developing

Install dependencies with `bun install`, then start a development server:

```sh
bun run dev

# or start the server and open the app in a new browser tab
bun run dev -- --open
```

## Game prototype

Run `bun run dev` and open `/game` to launch the Phaser JRPG vertical slice.

## Building

To create a production version of your app:

```sh
bun run build
```

You can preview the production build with `bun run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
