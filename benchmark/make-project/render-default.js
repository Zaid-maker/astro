import fs from 'node:fs/promises';
import { loremIpsumHtml, loremIpsumMd } from './_util.js';

// Map of files to be generated and tested for rendering.
// Ideally each content should be similar for comparison.
export const renderFiles = {
	'components/ListItem.astro': `\
---
const className = "text-red-500";
const { item } = Astro.props;
---
<li class={className}>{item}</li>
	`,
	'pages/astro.astro': `\
---
import ListItem from '../components/ListItem.astro';

const className = "text-red-500";
const style = { color: "red" };
const items = Array.from({ length: 3000 }, (_, i) => i);
---

<html>
  <head>
    <title>My Site</title>
  </head>
  <body>
    <h1 class={className + ' text-lg'}>List</h1>
    <ul style={style}>
      {items.map((item) => (
				<ListItem item={item} />
      ))}
    </ul>
    ${Array.from({ length: 1000 })
			.map(() => `<p>${loremIpsumHtml}</p>`)
			.join('\n')}
  </body>
</html>`,
	'pages/md.md': `\
# List

${Array.from({ length: 1000 }, (_, i) => i)
	.map((v) => `- ${v}`)
	.join('\n')}

${Array.from({ length: 1000 })
	.map(() => loremIpsumMd)
	.join('\n\n')}
`,
	'pages/mdx.mdx': `\
export const className = "text-red-500";
export const style = { color: "red" };
export const items = Array.from({ length: 1000 }, (_, i) => i);

# List

<ul style={style}>
  {items.map((item) => (
    <li class={className}>{item}</li>
  ))}
</ul>

${Array.from({ length: 1000 })
	.map(() => loremIpsumMd)
	.join('\n\n')}
`,
};

/**
 * @param {URL} projectDir
 */
export async function run(projectDir) {
	await fs.rm(projectDir, { recursive: true, force: true });
	await fs.mkdir(new URL('./src/pages', projectDir), { recursive: true });
	await fs.mkdir(new URL('./src/components', projectDir), { recursive: true });

	await Promise.all(
		Object.entries(renderFiles).map(([name, content]) => {
			return fs.writeFile(new URL(`./src/${name}`, projectDir), content, 'utf-8');
		})
	);

	await fs.writeFile(
		new URL('./astro.config.js', projectDir),
		`\
import { defineConfig } from 'astro/config';
import timer from '@benchmark/timer';
import mdx from '@astrojs/mdx';

export default defineConfig({
  integrations: [mdx()],
	output: 'server',
	adapter: timer(),
});`,
		'utf-8'
	);
}
