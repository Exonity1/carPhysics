import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from 'cannon-es'
import CannonDebugger from 'cannon-es-debugger'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

let speedElement = document.getElementById('speed');
const switchElement = document.getElementById('mySwitch');
let lastTime = Date.now(); // Initialisiere die letzte Zeit
let deltaTime = 0;
let fps = 0;
const renderer = new THREE.WebGLRenderer({ antialias: true });
const scene = new THREE.Scene();
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);
const gLTFloader = new GLTFLoader();
const camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);
const cameraPOV = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);
const controls = new OrbitControls(camera, renderer.domElement);
const cannonDebugger = new CannonDebugger(scene, world, {})
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

const composerPOV = new EffectComposer(renderer);
const renderPassPOV = new RenderPass(scene, cameraPOV);
composerPOV.addPass(renderPassPOV);
composerPOV.addPass(bloomPass);

camera.position.set(10,5,10);
camera.lookAt(0,0,0);

const keys = {
    w: false,
    s: false,
    a: false,
    d: false,
    shift: false
};

let gas = 0;
let speed = 100;
let steeringAngle = 0;


let ThreeCarBody;
loadCarBody();
function loadCarBody() {

    gLTFloader.load(

        'models/cyberCarBody.glb',


        function(gltf) {
            console.log("Model loaded");
            const model = gltf.scene;
            model.castShadow = true;
            model.receiveShadow = true;
            model.traverse(function(child) {
                if (child.isMesh) {
                    // Enable shadows for each mesh in the model
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });


            ThreeCarBody = model;
            cameraPOV.position.x = -7;
            cameraPOV.position.y = 3;
            cameraPOV.position.z = 0;
            cameraPOV.lookAt(0, 1.5, 0)
            ThreeCarBody.add(cameraPOV)
            
            scene.add(ThreeCarBody);
        },
        // Called while loading is progressing
        function(xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },

        // Called when loading has errors
        function(error) {
            console.log('An error happened', error);
        }
    );
}
let WheelFLBody;
let WheelFRBody;
let WheelRLBody;
let WheelRRBody;
for (let i = 0; i < 4; i++) {
    loadTireModel(i)
    
}
function loadTireModel(i) {

    // Load GLB model
    gLTFloader.load(
        // Resource URL
        'models/cyberTireBody.glb',
        // Called when the resource is loaded
        function(gltf) {
            console.log("Tire Model loaded");

            // Get the model's scene
            let modelScene = gltf.scene;

            // Iterate over the model's children
            modelScene.traverse(function(child) {
                if (child.isMesh) {
                    // Apply the materials from the GLB file to the mesh
                    child.material = child.material;
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Add the entire scene to the appropriate gondel variable
            switch (i) {
                case 0:
                    WheelFLBody = modelScene;
                    scene.add(WheelFLBody);
                    break;
                case 1:
                    WheelFRBody = modelScene;
                    scene.add(WheelFRBody);
                    break;
                case 2:
                    WheelRLBody = modelScene;
                    scene.add(WheelRLBody);
                    break;
                case 3:
                    WheelRRBody = modelScene;
                    scene.add(WheelRRBody);
                    break;
                default:
                    console.log("Invalid value of i");
            }

        },
        function(xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function(error) {
            console.log('An error happened', error);
        }
    );
}


const groundPlaneGeometry = new THREE.PlaneGeometry(100, 100);
const groundPlane = applyMaterial(groundPlaneGeometry, "textures/asphalt/Asphalt026C_1K-JPG_Color.jpg", "textures/asphalt/Asphalt026C_1K-JPG_NormalDX.jpg", "textures/asphalt/Asphalt026C_1K-JPG_Roughness.jpg")
groundPlane.rotation.x = -Math.PI / 2;
scene.add(groundPlane);










const groundMaterial = new CANNON.Material('groundMaterial');
// Create a ground body
const groundBody = new CANNON.Body({
    mass: 0, // Mass 0 makes it static
    shape: new CANNON.Plane(), // Create a plane shape
});
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // Rotate it to be flat
world.addBody(groundBody); // Add the ground body to the world

groundBody.material = groundMaterial;

// Setup des Fahrzeugs
const carBody = new CANNON.Body({
    mass: 1500,
    shape: new CANNON.Box(new CANNON.Vec3(3.8, 0.7, 1.5)),
});

carBody.position.set(0, 5, 0);
world.addBody(carBody);

// Räder hinzufügen
const wheelRadius = 0.45;
const wheelMass = 50;
const wheelShape = new CANNON.Sphere(wheelRadius, wheelRadius, 0.3, 12 * 8);

// Define the positions for each wheel directly
const positionFL = new CANNON.Vec3(1.5, 1, 1);  // Front Left (Vorderrad links)
const positionFR = new CANNON.Vec3(-1.5, 1, 1); // Front Right (Vorderrad rechts)
const positionRL = new CANNON.Vec3(1.5, 1, -1); // Rear Left (Hinterrad links)
const positionRR = new CANNON.Vec3(-1.5, 1, -1); // Rear Right (Hinterrad rechts)

// Create each wheel body and add it to the world
const WheelFL = new CANNON.Body({
    mass: wheelMass,
    shape: wheelShape,
});
WheelFL.position.copy(positionFL);
WheelFL.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
world.addBody(WheelFL);

const WheelFR = new CANNON.Body({
    mass: wheelMass,
    shape: wheelShape,
});
WheelFR.position.copy(positionFR);
WheelFR.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
world.addBody(WheelFR);

const WheelRL = new CANNON.Body({
    mass: wheelMass,
    shape: wheelShape,
});
WheelRL.position.copy(positionRL);
WheelRL.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
world.addBody(WheelRL);

const WheelRR = new CANNON.Body({
    mass: wheelMass,
    shape: wheelShape,
});
WheelRR.position.copy(positionRR);
WheelRR.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
world.addBody(WheelRR);

const wheelMaterial = new CANNON.Material('wheelMaterial');


const wheelGroundContactMaterial = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
    friction: 0.4,  // Adjust for more or less grip
    restitution: 0  // Set to zero to avoid bouncing
});

WheelFL.material = wheelMaterial;
WheelFR.material = wheelMaterial;
WheelRL.material = wheelMaterial;
WheelRR.material = wheelMaterial;

world.addContactMaterial(wheelGroundContactMaterial);



// Constraints für die Räder hinzufügen
let FLhingeConstraint = new CANNON.HingeConstraint(carBody, WheelFL, {
    pivotA: new CANNON.Vec3(2.15, -0.4, -1.6),
    pivotB: new CANNON.Vec3(0, 0, 0),
    axisA: new CANNON.Vec3(0, 0, 1),
    axisB: new CANNON.Vec3(0, 1, 0)
});

world.addConstraint(FLhingeConstraint);

let FRhingeConstraint = new CANNON.HingeConstraint(carBody, WheelFR, {
    pivotA: new CANNON.Vec3(2.15, -0.4, 1.6),
    pivotB: new CANNON.Vec3(0, 0, 0),
    axisA: new CANNON.Vec3(0, 0, 1),
    axisB: new CANNON.Vec3(0, 1, 0)
});

world.addConstraint(FRhingeConstraint);

const RLhingeConstraint = new CANNON.HingeConstraint(carBody, WheelRL, {
    pivotA: new CANNON.Vec3(-2.6, -0.4, -1.7),
    pivotB: new CANNON.Vec3(0, 0, 0),
    axisA: new CANNON.Vec3(0, 0, 1),
    axisB: new CANNON.Vec3(0, 1, 0)
});

world.addConstraint(RLhingeConstraint);

RLhingeConstraint.enableMotor();
RLhingeConstraint.setMotorMaxForce(50);

const RRhingeConstraint = new CANNON.HingeConstraint(carBody, WheelRR, {
    pivotA: new CANNON.Vec3(-2.6, -0.44, 1.7),
    pivotB: new CANNON.Vec3(0, 0, 0),
    axisA: new CANNON.Vec3(0, 0, 1),
    axisB: new CANNON.Vec3(0, 1, 0)
});

world.addConstraint(RRhingeConstraint);

RRhingeConstraint.enableMotor();
RRhingeConstraint.setMotorMaxForce(50);




















function animate() {
    requestAnimationFrame(animate);
    
    world.step(1 / 60, deltaTime, 10);
    checkKeyStates();

    //renderer.render(scene, camera);
    if (ThreeCarBody != null && switchElement.checked){
        composerPOV.render();
    }else{
        composer.render();
    }

    controls.update();
    //cannonDebugger.update();


    if (ThreeCarBody != null) syncObjectWithBody(ThreeCarBody, carBody);
    if (WheelFLBody != null) syncObjectWithBody(WheelFLBody, WheelFL);
    if (WheelFRBody != null) syncObjectWithBody(WheelFRBody, WheelFR);
    if (WheelRLBody != null) syncObjectWithBody(WheelRLBody, WheelRL);
    if (WheelRRBody != null) syncObjectWithBody(WheelRRBody, WheelRR);
    let aSpeed = carBody.velocity.length().toFixed(2)*3.6;
    speedElement.innerText = `Speed: ${aSpeed.toFixed(1)} km/h`;

    updateFPS();
    steer(steeringAngle);
    drive(gas);
}
animate();





function steer(angle) {
    let actual_angle = angle / -300
   

    if (actual_angle === 0) {
        //console.log("zurückgesetzt");
    } else {
        FLhingeConstraint.axisA.x = actual_angle;
        FRhingeConstraint.axisA.x = actual_angle;
    }
}

function drive(gasa) {

    if (gasa == 1) {
        RRhingeConstraint.setMotorSpeed(speed);
        RLhingeConstraint.setMotorSpeed(speed);
    } else if (gasa == -1) {
        RRhingeConstraint.setMotorSpeed(speed * -1);
        RLhingeConstraint.setMotorSpeed(speed * -1);
    } else if (gasa == 0) {
        RRhingeConstraint.setMotorSpeed(0);
        RLhingeConstraint.setMotorSpeed(0);

    }
}

function reset() {
    carBody.position.set(0,10,0);
}

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
loadHDRI('textures/hdri/metro_vijzelgracht_2k.hdr');

function syncObjectWithBody(threeObject, cannonBody) {
    threeObject.position.copy(cannonBody.position);
    threeObject.quaternion.copy(cannonBody.quaternion);
}

function handleKeyDown(event) {
    if (event.key === 'w') keys.w = true;
    if (event.key === 's') keys.s = true;
    if (event.key === 'a') keys.a = true;
    if (event.key === 'd') keys.d = true;
    if (event.key === ' ') keys.shift = true;
}

function handleKeyUp(event) {
    if (event.key === 'w') keys.w = false;
    if (event.key === 's') keys.s = false;
    if (event.key === 'a') keys.a = false;
    if (event.key === 'd') keys.d = false;
    if (event.key === ' ') keys.shift = false;
}

window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

function checkKeyStates() {
    if (keys.w && !keys.s) {
        gas = 1;
    }
    if (keys.s && !keys.w) {
        gas = -1;
    }
    if (keys.w && keys.s) {
        gas = 0
    }
    if (!keys.w && !keys.s) {
        gas = 0
    }


    if (keys.a && !keys.d) {
        if (steeringAngle > -100) steeringAngle = steeringAngle - 2;
    }


    if (keys.d && !keys.a) {
        if (steeringAngle < 100) steeringAngle = steeringAngle + 2;
    }

    if (keys.a && keys.d) {
        //donothing
    }
    if (!keys.a && !keys.d) {
        if (steeringAngle > 0) steeringAngle = steeringAngle - 2;
        if (steeringAngle < 0) steeringAngle = steeringAngle + 2;
        if (steeringAngle == 0);//donothing
    }

    if(keys.shift){
        wheelGroundContactMaterial.friction = 0.1;
    }
    if(!keys.shift){
        wheelGroundContactMaterial.friction = 0.65;
    }
    //console.log(steeringAngle);
}

window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}