// Minimale Typen für openbadges-bakery-v3, das keine eigenen mitbringt.
declare module 'openbadges-bakery-v3' {
	type BakeOptions = {
		image: Buffer;
		assertion: object | string;
	};

	const bakery: {
		bake(options: BakeOptions, callback: (err: Error | null, bakedImage: Buffer) => void): void;
	};

	export default bakery;
}
