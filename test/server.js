const express = require("express");
const app = express();

app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	next();
});

app.get("/:fileName", (req, res) => {
	res.sendFile(__dirname + "/public/" + req.params.fileName);
});

app.listen(8082, () => {
	console.log("Assets served on port 8082");
});
