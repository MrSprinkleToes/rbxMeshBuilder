import { parseString } from "browser-xml2js";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import constructMesh, { updateLods } from "../src";
import { decode } from "./rbxBinaryParser";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.appendChild(renderer.domElement);

const texLoader = new THREE.TextureLoader();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);
camera.position.z = 1.5;
new OrbitControls(camera, renderer.domElement);

// fetch("http://localhost:8082/bloxy.mesh")
// 	.then((response) => response.arrayBuffer())
// 	.then((buffer) => {
// 		console.log(buffer);
// 		fetch("http://localhost:8082/bloxy_tex.png")
// 			.then((response) => response.blob())
// 			.then((blob) => {
// 				const texture = texLoader.load(URL.createObjectURL(blob));
// 				const material = new THREE.MeshBasicMaterial({ map: texture });
// 				const mesh = constructMesh(buffer, material);
// 				scene.add(mesh);
// 			});
// 	});

function findMeshAssetIdXML(xml) {
	if (xml.$?.name == "MeshId") {
		return xml.url[0];
	}
	for (let prop in xml) {
		if (typeof xml[prop] == "object") {
			var found = findMeshAssetIdXML(xml[prop]);
			if (found) return found;
		}
	}
}
function findTextureAssetIdXML(xml) {
	if (xml.$?.name == "TextureId") {
		return xml.url[0];
	}
	for (let prop in xml) {
		if (typeof xml[prop] == "object") {
			var found = findTextureAssetIdXML(xml[prop]);
			if (found) return found;
		}
	}
}
function findScaleXML(xml) {
	if (xml.$?.name == "Scale") {
		return {
			X: parseFloat(xml.X[0]),
			Y: parseFloat(xml.Y[0]),
			Z: parseFloat(xml.Z[0]),
		};
	}
	for (let prop in xml) {
		if (typeof xml[prop] == "object") {
			var found = findScaleXML(xml[prop]);
			if (found) return found;
		}
	}
}

function findMesh(obj) {
	if (!obj.Children) {
		obj = obj[0];
	}
	for (let i = 0; i < obj.Children.length; i++) {
		if (obj.Children[i].MeshId !== undefined) {
			return obj.Children[i];
		} else if (obj.Children[i].Children.length > 0) {
			return findMesh(obj.Children[i]);
		}
	}
}

async function loadHat(hatId, x, y) {
	const hatAsset = await fetch(
		`http://localhost:8083/https://assetdelivery.roblox.com/v2/asset?id=${hatId}`
	).then((response) => response.json());
	const hat = await fetch(hatAsset.locations[0].location).then((response) =>
		response.text()
	);
	const hatArrayBuffer = await fetch(hatAsset.locations[0].location).then(
		(response) => response.arrayBuffer()
	);

	var result;
	parseString(hat, (undefined, xml) => {
		result = xml;
	});

	if (!result) {
		result = decode(hatArrayBuffer);
	}

	var meshLink = findMeshAssetIdXML(result) || findMesh(result).MeshId;
	var textureLink = findTextureAssetIdXML(result) || findMesh(result).TextureId;
	var scale = findScaleXML(result) || findMesh(result).Scale;
	const meshId = meshLink.split("?id=")[1] || meshLink.split("//")[1];
	const textureId = textureLink.split("?id=")[1] || textureLink.split("//")[1];

	const meshAsset = await fetch(
		`http://localhost:8083/https://assetdelivery.roblox.com/v2/asset?id=${meshId}`
	).then((response) => response.json());
	const mesh = await fetch(meshAsset.locations[0].location).then((response) =>
		response.arrayBuffer()
	);
	const textureAsset = await fetch(
		`http://localhost:8083/https://assetdelivery.roblox.com/v2/asset?id=${textureId}`
	).then((response) => response.json());
	const textureBlob = await fetch(textureAsset.locations[0].location).then(
		(response) => response.blob()
	);

	const texture = texLoader.load(URL.createObjectURL(textureBlob));
	const material = new THREE.MeshBasicMaterial({ map: texture });
	constructMesh(mesh, material, true, scale).then((meshObj) => {
		meshObj.rotation.y = Math.PI;
		meshObj.position.x = x * 4;
		meshObj.position.z = y * 4;
		scene.add(meshObj);
	});
}

function render() {
	renderer.render(scene, camera);
	updateLods(camera);
	requestAnimationFrame(render);
}
requestAnimationFrame(render);

var queries = [];
var baseQuery =
	"http://localhost:8083/https://catalog.roblox.com/v1/search/items/details?Category=11&CreatorName=Roblox&Limit=30&SortType=2";
async function a() {
	var query =
		"http://localhost:8083/https://catalog.roblox.com/v1/search/items/details?Category=11&CreatorName=Roblox&Limit=30&SortType=2";
	for (let i = 0; i < 10; i++) {
		await fetch(query)
			.then((response) => response.json())
			.then((json) => {
				query = baseQuery + "&Cursor=" + json.nextPageCursor;
				queries.push(query);
			});
	}

	// loadHat spawns a hat at a given x and y
	var a = 0;
	for (let i = 0; i < 10; i++) {
		var query = queries[i];
		fetch(query)
			.then((response) => response.json())
			.then((json) => {
				console.log(json);
				for (let j = 0; j < json.data.length; j++) {
					// calculate x and y so that all the hats are next to each other in a grid
					// gap of 4 between each hat
					// take into account the group of 10 that we're on (i)
					// take into account the index of the hat in the group (j)
					var x = a % 20;
					var y = Math.floor(a / 20);
					a++;
					loadHat(json.data[j].id, x, y);
				}
			});
	}
}
a();
