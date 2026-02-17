import { decode, encode } from "@cf-wasm/png/workerd";
import { encode as encodeGIF } from 'gifski-wasm/cloudflare';

// =====================================================
// LOOKUP TABLE (FULL)
// =====================================================
const LOOKUP = [
	0xFFFFFF, 0xFFD4BF, 0xFFE9BF, 0xFFFFBF, 0xE9FFBF, 0xD4FFBF,
	0xBFFFBF, 0xBFFFD4, 0xBFFFE9, 0xBFFFFF, 0xBFE9FF, 0xBFD4FF,
	0xBFBFFF, 0xD4BFFF, 0xE9BFFF, 0xFFBFFF, 0xFFBFE9, 0xFFBFD4,
	0xFFBFBF, 0xDADADA, 0xBF9F8F, 0xBFAF8F, 0xBFBF8F, 0xAFBF8F,
	0x9FBF8F, 0x8FBF8F, 0x8FBF9F, 0x8FBFAF, 0x8FBFBF, 0x8FAFBF,
	0x8F9FBF, 0x8F8FBF, 0x9F8FBF, 0xAF8FBF, 0xBF8FBF, 0xBF8FAF,
	0xBF8F9F, 0xBF8F8F, 0xB6B6B6, 0xBF7F5F, 0xBFAF8F, 0xBFBF5F,
	0x9FBF5F, 0x7FBF5F, 0x5FBF5F, 0x5FBF7F, 0x5FBF9F, 0x5FBFBF,
	0x5F9FBF, 0x5F7FBF, 0x5F5FBF, 0x7F5FBF, 0x9F5FBF, 0xBF5FBF,
	0xBF5F9F, 0xBF5F7F, 0xBF5F5F, 0x919191, 0xBF6A3F, 0xBF943F,
	0xBFBF3F, 0x94BF3F, 0x6ABF3F, 0x3FBF3F, 0x3FBF6A, 0x3FBF94,
	0x3FBFBF, 0x3F94BF, 0x3F6ABF, 0x3F3FBF, 0x6A3FBF, 0x943FBF,
	0xBF3FBF, 0xBF3F94, 0xBF3F6A, 0xBF3F3F, 0x6D6D6D, 0xFF5500,
	0xFFAA00, 0xFFFF00, 0xAAFF00, 0x54FF00, 0x00FF00, 0x00FF54,
	0x00FFAA, 0x00FFFF, 0x00A9FF, 0x0055FF, 0x0000FF, 0x5500FF,
	0xA900FF, 0xFE00FF, 0xFF00AA, 0xFF0055, 0xFF0000, 0x484848,
	0xBF3F00, 0xBF7F00, 0xBFBF00, 0x7FBF00, 0x3FBF00, 0x00BF00,
	0x00BF3F, 0x00BF7F, 0x00BFBF, 0x007FBF, 0x003FBF, 0x0000BF,
	0x3F00BF, 0x7F00BF, 0xBF00BF, 0xBF007F, 0xBF003F, 0xBF0000,
	0x242424, 0x7F2A00, 0x7F5500, 0x7F7F00, 0x557F00, 0x2A7F00,
	0x007F00, 0x007F2A, 0x007F55, 0x007F7F, 0x00547F, 0x002A7F,
	0x00007F, 0x2A007F, 0x54007F, 0x7F007F, 0x7F0055, 0x7F002A,
	0x7F0000,
];

const SPEEDS = {
	1: 500,
	2: 350,
	3: 300,
	4: 150,
	5: 150,
	6: 150,
	7: 150,
	8: 80,
	9: 80
};

// =====================================================
// PUBLIC FUNCTION
// =====================================================
export async function renderFrame(options, outfitPack, mountPack) {
	const {
		id,
		addons = 0,
		head = 0,
		body = 0,
		legs = 0,
		feet = 0,
		mounthead = 0,
		mountbody = 0,
		mountlegs = 0,
		mountfeet = 0,
		mount = 0,
		direction = 3,
		animation = 1,
	} = options;

	const mountId = mount & 0xffff;
	const mountState = mountId > 0 ? 2 : 1;

	const base = await loadPNGFromTar(
		outfitPack,
		`${animation}_${mountState}_1_${direction}.png`
	);

	if (!base) {
		throw new Error(
			`Outfit base image not found: ${animation}_${mountState}_1_${direction}.png`
		);
	}

	// TEMPLATE OPTIONAL
	const template = await loadPNGFromTar(
		outfitPack,
		`${animation}_${mountState}_1_${direction}_template.png`
	);

	// Apply addons
	if (addons === 1 || addons === 3) {
		await applyAddon(outfitPack, id, animation, mountState, 2, direction, base, template);
	}

	if (addons === 2 || addons === 3) {
		await applyAddon(outfitPack, id, animation, mountState, 3, direction, base, template);
	}

	// Colorize only if template exists
	if (template) {
		colorize(template, base, head, body, legs, feet);
	}

	// Mount overlay
	if (mountState === 2) {
		const mountTemplate = await loadPNGFromTar(
			mountPack,
			`${animation}_1_1_${direction}_template.png`
		);
		const mountImg = await loadPNGFromTar(
			mountPack,
			`${animation}_1_1_${direction}.png`
		);

		if (mountTemplate) {
			colorize(mountTemplate, mountImg, mounthead, mountbody, mountlegs, mountfeet);
		}

		if (mountImg) {
			alphaOverlay(mountImg, base);
			return mountImg; // return raw RGBA
		} else {
			console.log(
				"Cannot find mount image",
				`${animation}_1_1_${direction}.png`
			);
		}
	}

	return base; // raw RGBA
}

export async function createColorizedOutfit(options, outfitPack, mountPack) {
	const image = await renderFrame(options, outfitPack, mountPack);
	return encodePNG(image);
}

export async function createAnimatedGIF(options, outfitPack, mountPack) {

	const outfitMetadata = await loadMetadataFromTar(outfitPack);

	if (!outfitMetadata) {
		throw new Error("Specific outfit dos not have metadata")
	}

	let frames = [];

	let width = 32;
	let height = 32;
	const framePromises = [];
	const frameDurations = [];
	if (options.rotate) {
		for (let d = 1; d <= 4; d++) {
			for (let f = 1; f <= outfitMetadata.frameCount; f++) {
				framePromises.push(renderFrame({
					...options,
					direction: d,
					animation: f,
				}, outfitPack, mountPack));
				frameDurations.push(SPEEDS[outfitMetadata.frameCount]);
			}
		}
	} else {
		for (let f = 1; f <= outfitMetadata.frameCount; f++) {
			framePromises.push(renderFrame({
				...options,
				animation: f,
			}, outfitPack, mountPack));
			frameDurations.push(SPEEDS[outfitMetadata.frameCount]);
		}
	}

	const resolvedFrames = await Promise.all(framePromises);
	for (let frame of resolvedFrames) {
		width = frame.width;
		height = frame.height;
		frames.push(frame.image)
	}

	const gif = await encodeGIF({
		frames,
		frameDurations: frameDurations,
		width: width,
		height: height,
	});

	return gif;
}

// =====================================================
// LOAD PNG
// =====================================================

async function loadPNGFromTar(pack, filename) {
	const fileBuffer = pack.get(filename);
	if (!fileBuffer) return null;

	return decode(fileBuffer);
}

async function loadMetadataFromTar(pack) {
	const fileBuffer = pack.get("outfit_data.json");
	if (!fileBuffer) return null;

	const jsonString = new TextDecoder().decode(fileBuffer);
	return JSON.parse(jsonString);
}
// =====================================================
// APPLY ADDON
// =====================================================
async function applyAddon(outfitPack, id, animation, mountState, addonId, direction, base, template) {
	const addon = await loadPNGFromTar(
		outfitPack,
		`${animation}_${mountState}_${addonId}_${direction}.png`
	);

	if (addon) alphaOverlay(base, addon);

	// Only apply template overlay if template exists
	if (template) {
		const addonTemplate = await loadPNGFromTar(
			outfitPack,
			`${animation}_${mountState}_${addonId}_${direction}_template.png`
		);

		if (addonTemplate) alphaOverlay(template, addonTemplate);
	}
}

// =====================================================
// COLORIZE
// =====================================================
function colorize(template, outfit, head, body, legs, feet) {
	const t = template.image;
	const o = outfit.image;

	for (let i = 0; i < t.length; i += 4) {
		const rt = t[i];
		const gt = t[i + 1];
		const bt = t[i + 2];

		let index = null;

		if (rt && gt && !bt) index = head;
		else if (rt && !gt && !bt) index = body;
		else if (!rt && gt && !bt) index = legs;
		else if (!rt && !gt && bt) index = feet;

		if (index === null) continue;

		const value = LOOKUP[index] || 0;

		const rTarget = (value >> 16) & 0xff;
		const gTarget = (value >> 8) & 0xff;
		const bTarget = value & 0xff;

		o[i] = (o[i] * rTarget) / 255;
		o[i + 1] = (o[i + 1] * gTarget) / 255;
		o[i + 2] = (o[i + 2] * bTarget) / 255;
	}
}

// =====================================================
// ALPHA OVERLAY
// =====================================================
function alphaOverlay(dest, overlay) {
	const d = dest.image;
	const o = overlay.image;

	for (let i = 0; i < o.length; i += 4) {
		const alpha = o[i + 3];
		if (alpha === 0) continue;

		const a = alpha / 255;

		d[i] = o[i] * a + d[i] * (1 - a);
		d[i + 1] = o[i + 1] * a + d[i + 1] * (1 - a);
		d[i + 2] = o[i + 2] * a + d[i + 2] * (1 - a);
		d[i + 3] = 255;
	}
}

// =====================================================
// ENCODE
// =====================================================
function encodePNG(image) {
	return encode( image.image, image.width, image.height);
}
