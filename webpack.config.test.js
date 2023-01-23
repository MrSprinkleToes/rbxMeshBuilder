const htmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
	entry: "./test/index.js",
	output: {
		path: __dirname + "/distTest",
	},
	plugins: [
		new htmlWebpackPlugin({
			template: "./test/index.html",
		}),
	],
	mode: "development",
};
