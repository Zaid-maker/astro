import type fsMod from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bold } from 'kleur/colors';
import { type Plugin, normalizePath } from 'vite';
import type { AstroSettings } from '../@types/astro.js';
import { type Logger } from '../core/logger/core.js';

export function getEnvTsPath({ srcDir }: { srcDir: URL }) {
	return new URL('env.d.ts', srcDir);
}

export function astroInjectEnvTsPlugin({
	settings,
	logger,
	fs,
}: {
	settings: AstroSettings;
	logger: Logger;
	fs: typeof fsMod;
}): Plugin {
	return {
		name: 'astro-inject-env-ts',
		// Use `post` to ensure project setup is complete
		// Ex. `.astro` types have been written
		enforce: 'post',
		async config() {
			await setUpEnvTs({ settings, logger, fs });
		},
	};
}

function getDotAstroTypeReference({
	settings,
	filename,
}: { settings: AstroSettings; filename: string }) {
	const contentTypesRelativeToSrcDir = normalizePath(
		path.relative(
			fileURLToPath(settings.config.srcDir),
			fileURLToPath(new URL(filename, settings.dotAstroDir))
		)
	);

	return `/// <reference path=${JSON.stringify(contentTypesRelativeToSrcDir)} />`;
}

export async function setUpEnvTs({
	settings,
	logger,
	fs,
}: {
	settings: AstroSettings;
	logger: Logger;
	fs: typeof fsMod;
}) {
	const envTsPath = getEnvTsPath(settings.config);
	const envTsPathRelativetoRoot = normalizePath(
		path.relative(fileURLToPath(settings.config.root), fileURLToPath(envTsPath))
	);

	if (fs.existsSync(envTsPath)) {
		let typesEnvContents = await fs.promises.readFile(envTsPath, 'utf-8');

		for (const injectedType of settings.injectedTypes) {
			if (await injectedType.condition?.()) {
				const expectedTypeReference = getDotAstroTypeReference({
					settings,
					filename: injectedType.filename,
				});

				if (!typesEnvContents.includes(expectedTypeReference)) {
					typesEnvContents = `${expectedTypeReference}\n${typesEnvContents}`;
				}
			}
		}

		logger.info('types', `Added ${bold(envTsPathRelativetoRoot)} type declarations`);
		await fs.promises.writeFile(envTsPath, typesEnvContents, 'utf-8');
	} else {
		// Otherwise, inject the `env.d.ts` file
		let referenceDefs: string[] = [];
		referenceDefs.push('/// <reference types="astro/client" />');

		for (const injectedType of settings.injectedTypes) {
			if (await injectedType.condition?.()) {
				referenceDefs.push(getDotAstroTypeReference({ settings, filename: injectedType.filename }));
			}
		}

		await fs.promises.mkdir(settings.config.srcDir, { recursive: true });
		await fs.promises.writeFile(envTsPath, referenceDefs.join('\n'), 'utf-8');
		logger.info('types', `Added ${bold(envTsPathRelativetoRoot)} type declarations`);
	}
}
