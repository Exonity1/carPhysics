import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from 'cannon-es'
import CannonDebugger from 'cannon-es-debugger'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let plateSpeed;
let gondelSpeed;
let lastTime = Date.now(); // Initialisiere die letzte Zeit
let deltaTime = 0;
let fps = 0;


const scene = new THREE.Scene();

const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

const gLTFloader = new GLTFLoader();

const camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 
  0.5,    // strength
  1,    // radius
  2    // threshold
);
composer.addPass(bloomPass);


























// Create a ground body
const groundBody = new CANNON.Body({
    mass: 0, // Mass 0 makes it static
    shape: new CANNON.Plane(), // Create a plane shape
});
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // Rotate it to be flat
world.addBody(groundBody); // Add the ground body to the world


// Setup des Fahrzeugs
const carBody = new CANNON.Body({
    mass: 2000,
    shape: new CANNON.Box(new CANNON.Vec3(2, 0.5, 0.7)),
});

carBody.position.set(0, 5, 0);
world.addBody(carBody);

// Räder hinzufügen
const wheelRadius = 0.5;
const wheelMass = 50;
const wheelShape = new CANNON.Cylinder(wheelRadius, wheelRadius, 0.3, 12);

const wheelPositions = [
    new CANNON.Vec3(1.5, -0.2, 1),  // Vorderrad links
    new CANNON.Vec3(-1.5, -0.2, 1), // Vorderrad rechts
    new CANNON.Vec3(1.5, -0.2, -1), // Hinterrad links
    new CANNON.Vec3(-1.5, -0.2, -1) // Hinterrad rechts
];

const wheels = wheelPositions.map(position => {
    const wheel = new CANNON.Body({
        mass: wheelMass,
        shape: wheelShape,
        material: new CANNON.Material({ friction: 0.3 })
    });

    wheel.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2); // Rad horizontal ausrichten
    world.addBody(wheel);
    return wheel;
});

// Constraints für die Räder hinzufügen
const constraints = [];

wheelPositions.forEach((position, index) => {
    const pivotA = position;
    const axisA = new CANNON.Vec3(0, 0, 1);
    const pivotB = new CANNON.Vec3(0, 0, 0);
    const axisB = new CANNON.Vec3(0, 1, 0);

    const constraint = new CANNON.HingeConstraint(carBody, wheels[index], {
        pivotA: pivotA,
        axisA: axisA,
        pivotB: pivotB,
        axisB: axisB
    });

    if (index === 2 || index === 3) {
        // Hinterräder motorisieren
        constraint.enableMotor();
        constraint.setMotorSpeed(0); // Motor initial stoppen
        constraint.setMotorMaxForce(120);
    }

    world.addConstraint(constraint);
    constraints.push(constraint);
});

// Lenkung implementieren
let steeringAngle = 0;

function steer(angle) {
    const maxSteeringAngle = Math.PI / 8; // Maximale Lenkung (22.5 Grad)
    steeringAngle = angle * maxSteeringAngle;

    const cosAngle = Math.cos(steeringAngle);
    const sinAngle = Math.sin(steeringAngle);

    // Lenkung für das linke Vorderrad (index 0)
    constraints[0].axisA.set(sinAngle, 0, cosAngle);

    // Lenkung für das rechte Vorderrad (index 1)
    constraints[1].axisA.set(sinAngle, 0, cosAngle);
}

// Fahrfunktion implementieren
let motorSpeed = 0;

function drive(speed) {
    motorSpeed = speed;
    constraints[2].setMotorSpeed(motorSpeed); // Hinterrad links
    constraints[3].setMotorSpeed(motorSpeed); // Hinterrad rechts
}







const groundPlaneGeometry = new THREE.PlaneGeometry(100, 100);
const groundPlane = applyMaterial(groundPlaneGeometry, "textures/asphalt/Asphalt026C_1K-JPG_Color.jpg", "textures/asphalt/Asphalt026C_1K-JPG_NormalDX.jpg", "textures/asphalt/Asphalt026C_1K-JPG_Roughness.jpg")
groundPlane.rotation.x = -Math.PI / 2;
scene.add(groundPlane);



camera.position.x = 10;
camera.position.y = 10;
camera.position.z = 5;
camera.lookAt(0, 0, 0)


const controls = new OrbitControls(camera, renderer.domElement);
const cannonDebugger = new CannonDebugger(scene, world, {

})





function animate() {
    requestAnimationFrame(animate);


    // Führe die Physik-Update-Schritt aus
    world.step(1 / 60, deltaTime, 3);
    

    // Rendern und Steuerung aktualisieren
    //renderer.render(scene, camera);
    composer.render();
    controls.update();

    // Synchronisiere Objekte mit den Körpern
    
    cannonDebugger.update();

    //if (kreuzA != null) syncObjectWithBody(kreuzA, kreuzABody);
    

    

    // FPS-Zähler aktualisieren
    updateFPS();

    steer(gondelSpeed);
    drive(plateSpeed);
  
  
}


animate();






const slider1 = document.getElementById('slider1');
const slider2 = document.getElementById('slider2');

slider1.addEventListener('input', () => {
    const value = parseFloat(slider1.value);
    
    plateSpeed = value * 0.001 *5;
});

slider2.addEventListener('input', () => {
    const value = parseFloat(slider2.value);
    
    gondelSpeed = value * 0.001 *5;  




    carBody.position.set(0, 5, 0);

});



loadHDRI('textures/hdri/metro_vijzelgracht_2k.hdr');



function updateFPS() {
    const now = Date.now();
    deltaTime = (now - lastTime) / 1000; // Zeit in Sekunden
    lastTime = now;

    if (deltaTime > 0) {
        fps = Math.round(1 / deltaTime); // FPS berechnen
    }

    document.getElementById('fpsCounter').textContent = `FPS: ${fps}`;
}


function applyMaterial(object, colorTexturePath, normalTexturePath, roughnessTexturePath) {
  // Load textures
  const loader = new THREE.TextureLoader();
  const colorTexture = loader.load(colorTexturePath);
  const normalTexture = loader.load(normalTexturePath);
  const roughnessTexture = loader.load(roughnessTexturePath);

  // Scale the textures (adjust the scale as needed)
  colorTexture.repeat.set(20, 20);
  normalTexture.repeat.set(20, 20);
  roughnessTexture.repeat.set(20, 20);

  normalTexture.invert = true;

  colorTexture.wrapS = THREE.RepeatWrapping;
  colorTexture.wrapT = THREE.RepeatWrapping;
  normalTexture.wrapS = THREE.RepeatWrapping;
  normalTexture.wrapT = THREE.RepeatWrapping;
  roughnessTexture.wrapS = THREE.RepeatWrapping;
  roughnessTexture.wrapT = THREE.RepeatWrapping;

  // Create MeshPhysicalMaterial
  const material = new THREE.MeshPhysicalMaterial({
    map: colorTexture,
    normalMap: normalTexture,
    roughnessMap: roughnessTexture,
  });

  // Apply material to object
  const mesh = new THREE.Mesh(object, material);

  // Enable shadows
  mesh.castShadow = true;     // Object will cast shadows
  mesh.receiveShadow = true;  // Object will receive shadows

  return mesh;
}


function loadHDRI(path) {

  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const hdriLoader = new RGBELoader()
  hdriLoader.load(path, function(texture) {
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    texture.dispose();
    scene.environment = envMap
  });

}


function syncObjectWithBody(threeObject, cannonBody) {
  threeObject.position.copy(cannonBody.position);
  threeObject.quaternion.copy(cannonBody.quaternion);
}
