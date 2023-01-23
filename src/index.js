import * as THREE from "three";
import ByteReader from "./ByteReader";

export default function constructMesh(buffer) {
	const reader = new ByteReader(buffer);

	var version = [];
	while (version[version.length - 1] != "\n") {
		version.push(String.fromCharCode(reader.uint8()));
	}
	version = version.join("");
	console.log(version);
}
