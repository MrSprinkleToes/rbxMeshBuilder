import * as THREE from "three";
import ByteReader from "./ByteReader";

var meshes = []; // store generated meshes for lod switching

function readLine(reader) {
	var line = [];
	while (
		line[line.length - 1] != "\n" &&
		reader.byteOffset < reader.data.byteLength
	) {
		line.push(String.fromCharCode(reader.uint8()));
	}
	return line.join("");
}

async function constructMeshV1_00(reader) {
	const geometry = new THREE.BufferGeometry();
	var positions = [];
	var normals = [];
	var uvs = [];

	const numVerts = readLine(reader);
	const data = readLine(reader).match(/\[(.*?)\]/gm);

	for (let i = 0; i < numVerts * 3; i++) {
		var pos = JSON.parse(data[i * 3]);
		var norm = JSON.parse(data[i * 3 + 1]);
		var uv = JSON.parse(data[i * 3 + 2]);

		positions.push(pos[0] / 2, pos[1] / 2, pos[2] / 2);
		normals.push(norm[0], norm[1], norm[2]);
		uvs.push(uv[0], uv[1]);
	}

	geometry.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(positions, 3)
	);
	geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
	geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));

	return geometry;
}

function getV2Header(reader) {
	return {
		headerSize: reader.uint16(true),
		vertSize: reader.uint8(),
		faceSize: reader.uint8(),
		vertCount: reader.uint32(true),
		faceCount: reader.uint32(true),
	};
}
function getV3Header(reader) {
	return {
		headerSize: reader.uint16(true),
		vertSize: reader.uint8(),
		faceSize: reader.uint8(),
		lodSize: reader.uint16(true),
		lodCount: reader.uint16(true),
		vertCount: reader.uint32(true),
		faceCount: reader.uint32(true),
	};
}
function getV4Header(reader) {
	return {
		headerSize: reader.uint16(true),
		lodType: reader.uint16(true),
		vertCount: reader.uint32(true),
		faceCount: reader.uint32(true),
		lodCount: reader.uint16(true),
		boneCount: reader.uint16(true),
		boneNamesSize: reader.uint32(true),
		subsetCount: reader.uint16(true),
		highQualityLodCount: reader.uint8(),
		unused: reader.uint8(),
	};
}

async function constructMeshV234_001(version, reader) {
	const geometry = new THREE.BufferGeometry();
	var positions = [];
	var normals = [];
	var uvs = [];
	var indices = [];
	var indices = [];
	var lods = [];

	var header;
	if (version.startsWith("version 2.00")) {
		header = getV2Header(reader);
	} else if (version.startsWith("version 3.00")) {
		header = getV3Header(reader);
	} else if (version.startsWith("version 4.0")) {
		header = getV4Header(reader);
		console.log(header);
	}

	for (let i = 0; i < header.vertCount; i++) {
		var pos = [
			reader.float32(true),
			reader.float32(true),
			reader.float32(true),
		];
		var norm = [
			reader.float32(true),
			reader.float32(true),
			reader.float32(true),
		];
		var uv = [reader.float32(true), 1 - reader.float32(true)];
		reader.move(4); // skip tangent vector & bi-normal direction
		var color = [255, 255, 255, 255];
		if (header.vertSize == 40) {
			color = [reader.uint8(), reader.uint8(), reader.uint8(), reader.uint8()];
		} else {
			reader.move(4);
		}

		positions.push(...pos);
		normals.push(...norm);
		uvs.push(...uv);
	}

	for (let i = 0; i < header.faceCount; i++) {
		indices.push(reader.uint32(true), reader.uint32(true), reader.uint32(true));
	}

	for (let i = 0; i < header.lodCount; i++) {
		lods.push(reader.uint32(true));
	}

	geometry.setAttribute(
		"position",
		new THREE.Float32BufferAttribute(positions, 3)
	);
	geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
	geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
	geometry.setIndex(
		version.startsWith("version 2.") ? indices : indices.slice(0, lods[1] * 3)
	);

	return [geometry, indices, lods];
}

export default async function constructMesh(
	buffer,
	material,
	autoLod = true,
	scale = { X: 1, Y: 1, Z: 1 }
) {
	return new Promise((resolve, reject) => {
		const reader = new ByteReader(buffer);

		var version = readLine(reader);
		var promise;

		console.log(version);

		if (version.startsWith("version 1.")) {
			promise = constructMeshV1_00(reader);
			promise.then((geometry) => {
				var mesh = new THREE.Mesh(geometry, material);
				geometry.scale(scale.X, scale.Y, scale.Z);
				resolve(mesh);
			});
		} else {
			promise = constructMeshV234_001(version, reader);
			promise.then(([geometry, indices, lods]) => {
				var mesh = new THREE.Mesh(geometry, material);
				if (autoLod && !version.startsWith("version 2.")) {
					meshes.push([mesh, indices, lods, 0]);
				}
				geometry.scale(scale.X, scale.Y, scale.Z);
				resolve(mesh);
			});
		}
	});
}

export function updateLods(camera) {
	for (let i = 0; i < meshes.length; i++) {
		var mesh = meshes[i][0];
		var indices = meshes[i][1];
		var lods = meshes[i][2];
		var currentLod = meshes[i][3];

		var distance = camera.position.distanceTo(mesh.position);
		if (distance < 250) {
			if (currentLod == 0) continue;
			console.log("LOD 0");
			mesh.geometry.setIndex(indices.slice(0, lods[1] * 3));
			mesh.geometry.attributes.position.needsUpdate = true;
			meshes[i][3] = 0;
		} else if (distance < 500) {
			if (currentLod == 1) continue;
			console.log("LOD 1");
			mesh.geometry.setIndex(indices.slice(lods[2] * 3, lods[3] * 3));
			mesh.geometry.attributes.position.needsUpdate = true;
			meshes[i][3] = 1;
		} else if (distance > 500) {
			if (currentLod == 2) continue;
			console.log("LOD 2");
			mesh.geometry.setIndex(indices.slice(lods[4] * 3, lods[5] * 3));
			mesh.geometry.attributes.position.needsUpdate = true;
			meshes[i][3] = 2;
		}
	}
}
