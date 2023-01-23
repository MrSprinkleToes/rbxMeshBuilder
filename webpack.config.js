module.exports = {
	entry: "./src/index.js",
	output: {
		path: __dirname + "/dist",
		filename: "rbxMeshBuilder.js",
		library: {
			type: "module",
		},
	},
	experiments: {
		outputModule: true,
	},
};
