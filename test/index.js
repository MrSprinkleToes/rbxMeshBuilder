import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import constructMesh from "../src";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.style.margin = "0";
document.body.style.overflow = "hidden";
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
	75,
	window.innerWidth / window.innerHeight,
	0.1,
	1000
);
camera.position.z = 5;
new OrbitControls(camera, renderer.domElement);

const box = new THREE.Mesh(
	new THREE.BoxGeometry(1, 1, 1),
	new THREE.MeshBasicMaterial({ color: 0x00ff00 })
);
scene.add(box);

fetch("http://localhost:8082/baseballcap.mesh")
	.then((response) => response.arrayBuffer())
	.then((buffer) => {
		console.log(buffer);
		constructMesh(buffer);
	});

function render() {
	renderer.render(scene, camera);
	requestAnimationFrame(render);
}
requestAnimationFrame(render);
