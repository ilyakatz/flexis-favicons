import fs from 'fs';
import path from 'path';
import Vinyl from 'vinyl';
import {
	icons as defaultIcons,
	manifest as defaultManifset
} from '../src/defaults';
import { iconsToGenerate } from '../src/icons';
import { attachMetadata } from '../src/helpers';
import FaviconsGenerator from '../src';
import { svg } from './favicon';

jest.setTimeout(600000);

async function vinylsFromAsyncIterator(iterator: AsyncIterableIterator<Vinyl>): Promise<Vinyl[]> {

	const vinyls: Vinyl[] = [];

	for await (const vinyl of iterator) {
		attachMetadata(vinyl);
		vinyls.push(vinyl);
		fs.writeFileSync(
			path.join(__dirname, 'artifacts', `FaviconsGenerator_${vinyl.basename}`),
			vinyl.contents
		);
	}

	return vinyls;
}

describe('FaviconsGenerator', () => {

	const manifest = {
		background_color: 'red'
	};

	it('should create correct instance', () => {

		const favicons = new FaviconsGenerator();

		expect(typeof favicons.generateIcons).toBe('function');
		expect(typeof favicons.generateManifset).toBe('function');
		expect(typeof favicons.generateHtmlHeaders).toBe('function');
	});

	it('should correct apply defaults', () => {

		let favicons = new FaviconsGenerator();
		let config = (favicons as any).config;

		expect(config.icons).toEqual(defaultIcons);
		expect(config.manifest).toEqual(defaultManifset);

		favicons = new FaviconsGenerator({ manifest });
		config = (favicons as any).config;

		expect(config.icons).toEqual(defaultIcons);
		expect(config.manifest).toEqual({
			...defaultManifset,
			...manifest
		});

		const icons = {
			favicon: true
		};

		favicons = new FaviconsGenerator({ icons });
		config = (favicons as any).config;

		expect(config.icons).toEqual(icons);
		expect(config.manifest).toEqual(defaultManifset);
	});

	describe('#generateIcons', () => {

		it('should throw error if no sources provided', () => {

			const favicons = new FaviconsGenerator();

			expect(
				vinylsFromAsyncIterator(favicons.generateIcons([]))
			).rejects.toThrow();
		});

		it('should throw error if format is not supported', () => {

			const bmp = svg.clone({ contents: false });

			bmp.extname = '.bmp';

			const favicons = new FaviconsGenerator();

			expect(
				vinylsFromAsyncIterator(favicons.generateIcons(bmp))
			).rejects.toThrow();
		});

		it('should generate icons only of one type', async () => {

			for (const iconType in defaultIcons) {

				const iconsOfTypeToGenerate = iconsToGenerate[iconType];
				const favicons = new FaviconsGenerator({
					manifest,
					icons: {
						[iconType]: true
					}
				});

				const icons = await vinylsFromAsyncIterator(favicons.generateIcons(svg));

				expect(icons.length).toBe(Object.keys(iconsOfTypeToGenerate).length);

				icons.forEach(({
					basename,
					metadata: {
						width,
						height
					}
				}) => {

					const iconConfig = iconsOfTypeToGenerate[basename];

					expect(iconConfig).toBeDefined();

					const {
						width: expectedWidth,
						height: expectedHeight
					} = iconConfig.sizes ? iconConfig.sizes[0] : iconConfig;

					expect(width).toBe(expectedWidth);
					expect(height).toBe(expectedHeight);
				});
			}
		});
	});
});