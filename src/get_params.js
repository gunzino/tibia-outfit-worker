function parseIntSafe(value, def) {
	if (!value) return def
	const n = parseInt(value)
	return Number.isNaN(n) ? def : n
}

function clamp(n, min, max) {
	return Math.max(min, Math.min(max, n))
}

export function getParams(url) {

	const addons = clamp(parseIntSafe(url.searchParams.get("addons"), 0), 0, 3)
	const head = clamp(parseIntSafe(url.searchParams.get("head"), 0), 0, 255)
	const body = clamp(parseIntSafe(url.searchParams.get("body"), 0), 0, 255)
	const legs = clamp(parseIntSafe(url.searchParams.get("legs"), 0), 0, 255)
	const feet = clamp(parseIntSafe(url.searchParams.get("feet"), 0), 0, 255)

	const mount = parseIntSafe(url.searchParams.get("mount"), 0)
	const direction = clamp(parseIntSafe(url.searchParams.get("direction"), 3), 1, 4)
	const animation = parseIntSafe(url.searchParams.get("animation"), 1)
	const rotate = parseIntSafe(url.searchParams.get("rotate"), 0)

	const pathname = url.pathname.toLowerCase();

	// Match /static/123 or /animate/123
	const match = pathname.match(/^\/(static|animate)\/(\d+)/);
	if (!match) return null;

	const mode = match[1];
	const animate = mode === "animate";
	const id = parseIntSafe(match[2], 0);
	if (!id) return null;

	return {
		id: id,
		addons: addons,
		head: head,
		body: body,
		legs: legs,
		feet: feet,
		mount: mount,
		direction: direction,
		animation: animation,
		rotate: rotate,
		animate: animate
	}
}

