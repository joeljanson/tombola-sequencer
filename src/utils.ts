export function constrain(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export function map(
	value: number,
	start1: number,
	stop1: number,
	start2: number,
	stop2: number
): number {
	return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
}

// Function to calculate the perpendicular distance from a point to a line segment
export function pointToSegmentDistance(
	px: number,
	py: number,
	x1: number,
	y1: number,
	x2: number,
	y2: number
) {
	const A = px - x1;
	const B = py - y1;
	const C = x2 - x1;
	const D = y2 - y1;

	const dot = A * C + B * D;
	const len_sq = C * C + D * D;
	const param = len_sq !== 0 ? dot / len_sq : -1;

	let xx, yy;

	if (param < 0) {
		xx = x1;
		yy = y1;
	} else if (param > 1) {
		xx = x2;
		yy = y2;
	} else {
		xx = x1 + param * C;
		yy = y1 + param * D;
	}

	const dx = px - xx;
	const dy = py - yy;
	return Math.sqrt(dx * dx + dy * dy);
}
