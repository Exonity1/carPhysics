import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as CANNON from 'cannon-es'
import CannonDebugger from 'cannon-es-debugger'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { SSRPass } from 'three/addons/postprocessing/SSRPass.js';
import { TAARenderPass } from 'three/addons/postprocessing/TAARenderPass.js';

class Loaded {
    loaded = false;
    max = 0;
    cnt = 0;
    fnct;

    constructor(max, fnct) {
        this.max = max;
        this.fnct = fnct;
    }

    add() {
        this.cnt++;
        if (this.cnt >= this.max) {
            this.loaded = true;
            if (this.fnct) {
                this.fnct(); // Call the function when loaded becomes true
            }
        }
    }
}
let loadedclass = new Loaded(6, hideLoadingScreen);

class Car {
    constructor(world, speed, motorForce) {
        this.world = world;
        this.speed = speed;
        this.steeringAngle = 0;
        this.gas = 0;
        this.motorForce = motorForce;

        this.groundMaterial = this.createGroundMaterial();
        this.carCollisionMaterial = this.createCarCollisionMaterial();
        this.wheelMaterial = this.createWheelMaterial();

        this.carBody = this.createCarBody();
        this.wheels = this.createWheels();
        this.constraints = this.createWheelConstraints();

        this.wheelGroundContactMaterial = this.createGroundContactMaterial();
    }

    createGroundMaterial() {
        const groundMaterial = new CANNON.Material('groundMaterial');
        const groundBody = new CANNON.Body({
            mass: 0, // statisch
            shape: new CANNON.Plane(),
            collisionFilterGroup: 5
        });
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        groundBody.material = groundMaterial;
        this.world.addBody(groundBody);
        return groundMaterial;
    }

    createCarCollisionMaterial() {
        return new CANNON.Material('carCollisionMaterial');
    }

    createWheelMaterial() {
        return new CANNON.Material('wheelMaterial');
    }

    createCarBody() {
        const carBody = new CANNON.Body({
            mass: 2000,
            shape: new CANNON.Box(new CANNON.Vec3(3.8, 0.7, 1.5)),
            collisionFilterGroup: 5,
            material: this.carCollisionMaterial
        });
        carBody.centerOfMassOffset = new CANNON.Vec3(1, -90000, 0);
        carBody.angularDamping = 0.1;
        carBody.position.set(0, 3, 6);
        this.world.addBody(carBody);
        return carBody;
    }

    createWheel(position) {
        const wheelShape = new CANNON.Sphere(0.45); // Radform
        const wheel = new CANNON.Body({
            mass: 50,
            shape: wheelShape,
            collisionFilterGroup: 2,
            collisionFilterMask: ~3
        });
        wheel.position.copy(position);
        wheel.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
        wheel.material = this.wheelMaterial;
        this.world.addBody(wheel);
        return wheel;
    }

    createWheels() {
        const positionFL = new CANNON.Vec3(1.5, 1, 1);
        const positionFR = new CANNON.Vec3(-1.5, 1, 1);
        const positionRL = new CANNON.Vec3(1.5, 1, -1);
        const positionRR = new CANNON.Vec3(-1.5, 1, -1);

        return {
            frontLeft: this.createWheel(positionFL),
            frontRight: this.createWheel(positionFR),
            rearLeft: this.createWheel(positionRL),
            rearRight: this.createWheel(positionRR)
        };
    }

    createWheelConstraints() {
        const constraints = {};

        constraints.FL = new CANNON.HingeConstraint(this.carBody, this.wheels.frontLeft, {
            pivotA: new CANNON.Vec3(2.15, -0.4, -1.6),
            pivotB: new CANNON.Vec3(0, 0, 0),
            axisA: new CANNON.Vec3(0, 0, 1),
            axisB: new CANNON.Vec3(0, 1, 0),
            stiffness: 0.1,
            relaxation: 1
        });
        this.world.addConstraint(constraints.FL);

        constraints.FR = new CANNON.HingeConstraint(this.carBody, this.wheels.frontRight, {
            pivotA: new CANNON.Vec3(2.15, -0.4, 1.6),
            pivotB: new CANNON.Vec3(0, 0, 0),
            axisA: new CANNON.Vec3(0, 0, 1),
            axisB: new CANNON.Vec3(0, 1, 0),
            stiffness: 0.1,
            relaxation: 1
        });
        this.world.addConstraint(constraints.FR);

        constraints.RL = new CANNON.HingeConstraint(this.carBody, this.wheels.rearLeft, {
            pivotA: new CANNON.Vec3(-2.6, -0.4, -1.7),
            pivotB: new CANNON.Vec3(0, 0, 0),
            axisA: new CANNON.Vec3(0, 0, 1),
            axisB: new CANNON.Vec3(0, 1, 0),
            stiffness: 0.1,
            relaxation: 1
        });
        constraints.RL.enableMotor();
        constraints.RL.setMotorMaxForce(this.motorForce);
        this.world.addConstraint(constraints.RL);

        constraints.RR = new CANNON.HingeConstraint(this.carBody, this.wheels.rearRight, {
            pivotA: new CANNON.Vec3(-2.6, -0.4, 1.7),
            pivotB: new CANNON.Vec3(0, 0, 0),
            axisA: new CANNON.Vec3(0, 0, 1),
            axisB: new CANNON.Vec3(0, 1, 0),
            stiffness: 0.1,
            relaxation: 1
        });
        constraints.RR.enableMotor();
        constraints.RR.setMotorMaxForce(this.motorForce);
        this.world.addConstraint(constraints.RR);

        return constraints;
    }

    createGroundContactMaterial() {
        const wheelGroundContactMaterial = new CANNON.ContactMaterial(this.wheelMaterial, this.groundMaterial, {
            friction: 0.9,
            restitution: 0.001
        });
        this.world.addContactMaterial(wheelGroundContactMaterial);

        return wheelGroundContactMaterial;
    }

    createContactMaterial(material1, material2, friction, restitution) {
        return new CANNON.ContactMaterial(material1, material2, {
            friction,
            restitution
        });
    }
}






let wait = false;
let lastMoved = 2;
let xSetTo = 2000;
let lastTime = Date.now(); // Initialisiere die letzte Zeit
let deltaTime = 0;
let fps = 0;
let speedElement = document.getElementsByClassName('speed')[0];
let keys = {w: false, s: false, a: false, d: false, shift: false};
let gas = 0;
let speed = 200;
let motorForce = 40;
let steeringAngle = 0;

const switchElement1 = document.getElementById('mySwitch1');
const switchElement2 = document.getElementById('mySwitch2');
document.getElementById("resetbutton").addEventListener('click', reset);

let ThreeCarBody;
let WheelFLBody;
let WheelFRBody;
let WheelRLBody;
let WheelRRBody;
let groundPlane1;
let groudPlane1Coliders = [];
let groundPlane2;
let groudPlane2Coliders = [];


const boundsMaterial = new CANNON.Material('boundsMaterial');


const renderer = new THREE.WebGLRenderer({ antialias: true, shadowMap: { enabled: true, type: THREE.PCFSoftShadowMap } });
renderer.setSize(window.innerWidth, window.innerHeight);
const scene = new THREE.Scene();
const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
world.solver.iterations = 20;
world.solver.tolerance = 0.001;
const gLTFloader = new GLTFLoader();
const cannonDebugger = new CannonDebugger(scene, world, {})
document.body.appendChild(renderer.domElement);





let car = new Car(world, 200, 40);

//Camera 1
const camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
/*const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.1,    // strength
    0.1,    // radius
    2    // threshold
);
composer.addPass(bloomPass);
const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssaoPass.kernelRadius = 16; // Adjust the radius for the spread of shadows
ssaoPass.minDistance = 0.005;
ssaoPass.maxDistance = 0.5;
composer.addPass(ssaoPass);
const ssrPass = new SSRPass({
    renderer,
    scene,
    camera: camera,
    width: window.innerWidth,
    height: window.innerHeight,
    groundReflector: null, // Optionally, add a plane for specific reflections like water
    selects: null, // Optionally, specify which objects should have reflections
    opacity: 1.0,
    thickness: 0.018,
    maxDistance: 5,
});
composer.addPass(ssrPass);
*/
camera.position.set(10,5,10);
camera.lookAt(0,0,0);
const controls = new OrbitControls(camera, renderer.domElement);

//Camera 2 (POV)
const cameraPOV = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);
const composerPOV = new EffectComposer(renderer);
const renderPassPOV = new RenderPass(scene, cameraPOV);
composerPOV.addPass(renderPassPOV);
/*
const ssaoPassPOV = new SSAOPass(scene, cameraPOV, window.innerWidth, window.innerHeight);
ssaoPassPOV.kernelRadius = 16; // Adjust the radius for the spread of shadows
ssaoPassPOV.minDistance = 0.005;
ssaoPassPOV.maxDistance = 0.5;
composerPOV.addPass(ssaoPassPOV);
//composerPOV.addPass(bloomPass);
const ssrPassPOV = new SSRPass({
    renderer,
    scene,
    camera: cameraPOV,
    width: window.innerWidth,
    height: window.innerHeight,
    groundReflector: null, // Optionally, add a plane for specific reflections like water
    selects: null, // Optionally, specify which objects should have reflections
    opacity: 1.0,
    thickness: 0.018,
    maxDistance: 5,
});
composerPOV.addPass(ssrPassPOV);
*/

startFunctions();







/*
//cannon world setup
const groundMaterial = new CANNON.Material('groundMaterial');
// Create a ground body
const groundBody = new CANNON.Body({
    mass: 0, // Mass 0 makes it static
    shape: new CANNON.Plane(),
    collisionFilterGroup: 5, 
});
groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // Rotate it to be flat
world.addBody(groundBody); // Add the ground body to the world

groundBody.material = groundMaterial;

const carCollisionMaterial = new CANNON.Material('carCollisionMaterial'); 
// Setup des Fahrzeugs
const carBody = new CANNON.Body({
    mass: 2000,
    shape: new CANNON.Box(new CANNON.Vec3(3.8, 0.7, 1.5)),
    collisionFilterGroup: 5, // Assign bodyA to group 1
    material: carCollisionMaterial
});
carBody.centerOfMassOffset = new CANNON.Vec3(1, -90000, 0);
carBody.angularDamping = 0.1;
carBody.position.set(0, 3, 6);
world.addBody(carBody);

// Räder hinzufügen
const wheelRadius = 0.45;
const wheelMass = 50;
const wheelShape = new CANNON.Sphere(wheelRadius, wheelRadius, 0.3, 12 * 8, 10);

// Define the positions for each wheel directly
const positionFL = new CANNON.Vec3(1.5, 1, 1);  // Front Left (Vorderrad links)
const positionFR = new CANNON.Vec3(-1.5, 1, 1); // Front Right (Vorderrad rechts)
const positionRL = new CANNON.Vec3(1.5, 1, -1); // Rear Left (Hinterrad links)
const positionRR = new CANNON.Vec3(-1.5, 1, -1); // Rear Right (Hinterrad rechts)

// Create each wheel body and add it to the world
const WheelFL = new CANNON.Body({
    mass: wheelMass,
    shape: wheelShape,
    collisionFilterGroup: 2, // Assign bodyB to group 2
    collisionFilterMask: ~3 // Collide with everything except group 1
});
WheelFL.position.copy(positionFL);
WheelFL.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
world.addBody(WheelFL);

const WheelFR = new CANNON.Body({
    mass: wheelMass,
    shape: wheelShape,
    collisionFilterGroup: 2, // Assign bodyB to group 2
    collisionFilterMask: ~3 // Collide with everything except group 1
});
WheelFR.position.copy(positionFR);
WheelFR.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
world.addBody(WheelFR);

const WheelRL = new CANNON.Body({
    mass: wheelMass,
    shape: wheelShape,
    collisionFilterGroup: 2, // Assign bodyB to group 2
    collisionFilterMask: ~3 // Collide with everything except group 1
});
WheelRL.position.copy(positionRL);
WheelRL.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
world.addBody(WheelRL);

const WheelRR = new CANNON.Body({
    mass: wheelMass,
    shape: wheelShape,
    collisionFilterGroup: 2, // Assign bodyB to group 2
    collisionFilterMask: ~3 // Collide with everything except group 1
});
WheelRR.position.copy(positionRR);
WheelRR.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), Math.PI / 2);
world.addBody(WheelRR);

const wheelMaterial = new CANNON.Material('wheelMaterial');

const wheelGroundContactMaterial = new CANNON.ContactMaterial(wheelMaterial, groundMaterial, {
    friction: 0.9,  // Adjust for more or less grip
    restitution: 0.001  // Set to zero to avoid bouncing
});



WheelFL.material = wheelMaterial;
WheelFR.material = wheelMaterial;
WheelRL.material = wheelMaterial;
WheelRR.material = wheelMaterial;

world.addContactMaterial(wheelGroundContactMaterial);
world.addContactMaterial(carBodyBoundsContactMaterial);



// Constraints für die Räder hinzufügen
let FLhingeConstraint = new CANNON.HingeConstraint(carBody, WheelFL, {
    pivotA: new CANNON.Vec3(2.15, -0.4, -1.6),
    pivotB: new CANNON.Vec3(0, 0, 0),
    axisA: new CANNON.Vec3(0, 0, 1),
    axisB: new CANNON.Vec3(0, 1, 0),
    stiffness: 0.1,
    relaxation: 1
});

world.addConstraint(FLhingeConstraint);

let FRhingeConstraint = new CANNON.HingeConstraint(carBody, WheelFR, {
    pivotA: new CANNON.Vec3(2.15, -0.4, 1.6),
    pivotB: new CANNON.Vec3(0, 0, 0),
    axisA: new CANNON.Vec3(0, 0, 1),
    axisB: new CANNON.Vec3(0, 1, 0),
    stiffness: 0.1,
    relaxation: 1
});

world.addConstraint(FRhingeConstraint);

const RLhingeConstraint = new CANNON.HingeConstraint(carBody, WheelRL, {
    pivotA: new CANNON.Vec3(-2.6, -0.4, -1.7),
    pivotB: new CANNON.Vec3(0, 0, 0),
    axisA: new CANNON.Vec3(0, 0, 1),
    axisB: new CANNON.Vec3(0, 1, 0),
    stiffness: 0.1,
    relaxation: 1
});

world.addConstraint(RLhingeConstraint);

RLhingeConstraint.enableMotor();
RLhingeConstraint.setMotorMaxForce(motorForce);

const RRhingeConstraint = new CANNON.HingeConstraint(carBody, WheelRR, {
    pivotA: new CANNON.Vec3(-2.6, -0.4, 1.7),
    pivotB: new CANNON.Vec3(0, 0, 0),
    axisA: new CANNON.Vec3(0, 0, 1),
    axisB: new CANNON.Vec3(0, 1, 0),
    stiffness: 0.1,
    relaxation: 1
});

world.addConstraint(RRhingeConstraint);

RRhingeConstraint.enableMotor();
RRhingeConstraint.setMotorMaxForce(motorForce);


*/

world.addContactMaterial(car.createContactMaterial(car.carCollisionMaterial, boundsMaterial, 0.001, 0.9));















function animate() {
    requestAnimationFrame(animate);
    
    world.step(1 / 60, deltaTime, 10);
    checkKeyStates();
    replaceGroundPlane();
    //renderer.render(scene, camera);
    if (ThreeCarBody != null && switchElement1.checked){
        composer.render();
    }else{
        composerPOV.render();
    }
    if(switchElement2.checked){
        cannonDebugger.update();
    }

    controls.update();
    


    if (ThreeCarBody != null) syncObjectWithBody(ThreeCarBody, car.carBody);
    if (WheelFLBody != null) syncObjectWithBody(WheelFLBody, car.wheels.frontLeft);
    if (WheelFRBody != null) syncObjectWithBody(WheelFRBody, car.wheels.frontRight);
    if (WheelRLBody != null) syncObjectWithBody(WheelRLBody, car.wheels.rearLeft);
    if (WheelRRBody != null) syncObjectWithBody(WheelRRBody, car.wheels.rearRight);
    let aSpeed = car.carBody.velocity.length().toFixed(2)*3.6;
    if (Math.abs(aSpeed) >= 10) {
        speedElement.childNodes[0].nodeValue = `${aSpeed.toFixed(0)}`;
    } else {
        speedElement.childNodes[0].nodeValue = `${aSpeed.toFixed(1)}`;
    }
    

    updateSpeedometer(Math.abs(aSpeed), 340);
    updateFPS();
    steer(car.steeringAngle);
    drive(car.gas);
}







function updateSpeedometer(speed, maxSpeed){
    let bSpeed = speed/maxSpeed;
    let speedmarkers = [];
    for(let i = 1; i < 14; i++){
        speedmarkers.push(document.getElementsByClassName(`speed-marker-${i}`));
    }
    speedmarkers = speedmarkers.reverse();
    let c = Math.floor(bSpeed*13);
    for(let i = 0; i < 13; i++){
        if (i <= c) {
            speedmarkers[i][0].style.opacity = 0.95;
        } else {
            speedmarkers[i][0].style.opacity = 0.3;
        }
    }
}

function replaceGroundPlane() {
    if(wait){
        return;
    }
    let x = Math.floor(car.carBody.position.x);
    if(x % 1000 < 2 && x > 500){
        wait = true
        setTimeout(() => {
            if(lastMoved == 1){
                groundPlane2.position.x = xSetTo;
                groudPlane2Coliders.forEach(body => {
                    body.position.x = xSetTo;
                });
                lastMoved = 2;
                xSetTo += 1000;
            }else if(lastMoved == 2){
                groundPlane1.position.x = xSetTo;
                groudPlane1Coliders.forEach(body => {
                    body.position.x = xSetTo;
                });
                lastMoved = 1;
                xSetTo += 1000;
            }else{
                console.error("lastMoved is not 1 or 2 // Servere Error While Moving GroundPlane");
            }
            wait = false;
        }, 3000);
    }
}

function steer(angle) {
    let ratio = calcSteeringSpeed(car.carBody.velocity.length().toFixed(1),95)
    let actual_angle = angle / -200 * ratio
   
    if (actual_angle === 0) {
        //console.log("zurückgesetzt");
    } else {
        car.constraints.FL.axisA.x = actual_angle;
        car.constraints.FR.axisA.x = actual_angle;
    }
}

function drive(gasa) {

    if (gasa == 1) {
        car.constraints.RR.setMotorSpeed(speed);
        car.constraints.RL.setMotorSpeed(speed);
    } else if (gasa == -1) {
        car.constraints.RR.setMotorSpeed(speed * -1);
        car.constraints.RL.setMotorSpeed(speed * -1);
    } else if (gasa == 0) {
        car.constraints.RR.setMotorSpeed(0);
        car.constraints.RL.setMotorSpeed(0);

    }
}

function reset() {
    location.reload();
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

function loadHDRI(path) {

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const hdriLoader = new RGBELoader();

    hdriLoader.load(path, function(texture) {
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;
    texture.dispose();
    pmremGenerator.dispose();
    scene.environment = envMap;
    scene.background = envMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.3;
});

}

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
window.addEventListener('resize', onWindowResize, false);


function checkKeyStates() {
    if (keys.w && !keys.s) {
        car.gas = 1;
    }
    if (keys.s && !keys.w) {
        car.gas = -1;
    }
    if (keys.w && keys.s) {
        car.gas = 0
    }
    if (!keys.w && !keys.s) {
        car.gas = 0
    }


    if (keys.a && !keys.d) {
        if (car.steeringAngle > -100) car.steeringAngle = car.steeringAngle - 2;
    }


    if (keys.d && !keys.a) {
        if (car.steeringAngle < 100) car.steeringAngle = car.steeringAngle + 2;
    }

    if (keys.a && keys.d) {
        //donothing
    }
    if (!keys.a && !keys.d) {
        if (car.steeringAngle > 0) car.steeringAngle = car.steeringAngle - 2;
        if (car.steeringAngle < 0) car.steeringAngle = car.steeringAngle + 2;
        if (car.steeringAngle == 0);//donothing
    }

    if(keys.shift){
        car.wheelGroundContactMaterial.friction = 0.1;
    }
    if(!keys.shift){
        car.wheelGroundContactMaterial.friction = 0.9;
    }
    //console.log(steeringAngle);
}

function onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    cameraPOV.aspect = width / height;
    cameraPOV.updateProjectionMatrix();
    
    renderer.setSize(width, height);
    composer.setSize(width, height);
    composerPOV.setSize(width, height);
    ssaoPass.setSize(width, height);
    ssaoPassPOV.setSize(width, height);
    ssrPass.setSize(width, height);
    ssrPassPOV.setSize(width, height);
}

function calcSteeringSpeed(speed, maxSpeed){
    let steeringRatio
    let xSpeed
    if(speed == 0){
        xSpeed = 0;
    }else{
        xSpeed = speed/maxSpeed
    }
    steeringRatio = Math.pow(Math.E, -5*xSpeed);
    return steeringRatio
}

function hideLoadingScreen() {
    document.getElementById('loadingdiv').style.display = 'none';
    animate();
}

function refreshLoadingScreen(){
    let loadingText = document.getElementById('loadingstuff');
    if(loadingText.innerText === "Stuff is Still Loading /"){
        loadingText.innerText = "Stuff is Still Loading -";
    }else{
        loadingText.innerText = "Stuff is Still Loading /";
    }
}

function errorAlert(){
    document.getElementById('loadingstuff').innerText = "An Error Occured While Loading";
    document.getElementById('loadingstuff').style.color = "red";
}

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
            cameraPOV.position.x = -6;
            cameraPOV.position.y = 2;
            cameraPOV.position.z = 0;
            cameraPOV.lookAt(0, 1.5, 0)
            /*
            cameraPOV.position.x = 5;
            cameraPOV.position.y = 1.3;
            cameraPOV.position.z = 2.5;
            cameraPOV.lookAt(0, 1.5, 0)
            */
            ThreeCarBody.add(cameraPOV)
            scene.add(ThreeCarBody);
            loadedclass.add();
        },
        // Called while loading is progressing
        function(xhr) {
            refreshLoadingScreen();
        },

        // Called when loading has errors
        function(error) {
            console.log('An error happened', error);
            errorAlert();
        }
    );
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
            loadedclass.add();

        },
        function(xhr) {
            refreshLoadingScreen();
        },
        function(error) {
            console.log('An error happened', error);
            errorAlert();
        }
    );
}

function loadStreetModel() {

    gLTFloader.load(

        'models/streetassetver3.glb',


        function(gltf) {
            console.log("Model loaded");
            const model = gltf.scene;
            model.castShadow = true;
            model.receiveShadow = true;
            groundPlane1 = model;
            setStreet();
            loadedclass.add();
        },
        // Called while loading is progressing
        function(xhr) {
            refreshLoadingScreen();
        },

        // Called when loading has errors
        function(error) {
            console.log('An error happened', error);
            errorAlert();
        }
    );
}

function innitColiders(){
    
    groudPlane1Coliders.push(new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(1000, 2, 1.8)),
        collisionFilterGroup: 3, // Assign bodyA to group 1
        collisionFilterMask:  ~2// Collide with everything except group 2
    }));
    groudPlane1Coliders[0].position.set(0, 0, 0);
    
    groudPlane1Coliders.push(new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(1000, 2, 1)),
        collisionFilterGroup: 3, // Assign bodyA to group 1
        collisionFilterMask: ~2 // Collide with everything except group 2
    }));
    groudPlane1Coliders[1].position.set(0, 0, 15);

    groudPlane1Coliders.push(new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(1000, 2, 1)),
        collisionFilterGroup: 3, // Assign bodyA to group 1
        collisionFilterMask: ~2 // Collide with everything except group 2
    }));
    groudPlane1Coliders[2].position.set(0, 0, -15);

    for(let i = 0; i < groudPlane1Coliders.length; i++){
        groudPlane1Coliders[i].material = boundsMaterial;
        world.addBody(groudPlane1Coliders[i]);
    }

    groudPlane2Coliders.push(new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(1000, 2, 1.8)),
        collisionFilterGroup: 3, // Assign bodyA to group 1
        collisionFilterMask: ~2 // Collide with everything except group 2
    }));
    groudPlane2Coliders[0].position.set(1000, 0, 0);
    
    groudPlane2Coliders.push(new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(1000, 2, 1)),
        collisionFilterGroup: 3, // Assign bodyA to group 1
        collisionFilterMask: ~2 // Collide with everything except group 2
    }));
    groudPlane2Coliders[1].position.set(1000, 0, 15);

    groudPlane2Coliders.push(new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(new CANNON.Vec3(1000, 2, 1)),
        collisionFilterGroup: 3, // Assign bodyA to group 1
        collisionFilterMask: ~2 // Collide with everything except group 2
    }));
    groudPlane2Coliders[2].position.set(1000, 0, -15);

    for(let i = 0; i < groudPlane2Coliders.length; i++){
        groudPlane2Coliders[i].material = boundsMaterial;
        world.addBody(groudPlane2Coliders[i]);
    }
}

function setStreet(){
    scene.add(groundPlane1);
    groundPlane2 = groundPlane1.clone();
    groundPlane2.position.set(1000, 0, 0);
    scene.add(groundPlane2);
    innitColiders();
}

function startFunctions(){
    loadStreetModel();
    loadCarBody();
    for (let i = 0; i < 4; i++) {
        loadTireModel(i) 
    }
    loadHDRI('textures/hdri/nightsky.hdr');
}