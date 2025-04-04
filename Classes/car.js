import * as CANNON from 'cannon-es';

export class Car {
    constructor(world, speed, motorForce, groundMaterial, spawnPosition) {
        this.spawnPosition = spawnPosition;
        this.world = world;
        this.speed = speed;
        this.steeringAngle = 0;
        this.gas = 0;
        this.motorForce = motorForce;

        this.groundMaterial = groundMaterial;
        this.carCollisionMaterial = this.createCarCollisionMaterial();
        this.wheelMaterial = this.createWheelMaterial();

        this.carBody = this.createCarBody();
        this.wheels = this.createWheels();
        this.constraints = this.createWheelConstraints();

        this.wheelGroundContactMaterial = this.createGroundContactMaterial();
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
        carBody.centerOfMassOffset = new CANNON.Vec3(1, -0.5, 0);
        carBody.angularDamping = 0.1;
        
        const actualPosition = this.spawnPosition.vadd(new CANNON.Vec3(0, 4, 0));
        carBody.position.set(actualPosition.x, actualPosition.y, actualPosition.z);
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
        const stiffness = 0.1;
        const relaxation = 1;
        const groundClearance = -0.4;

        constraints.FL = new CANNON.HingeConstraint(this.carBody, this.wheels.frontLeft, {
            pivotA: new CANNON.Vec3(2.15, groundClearance, -1.6),
            pivotB: new CANNON.Vec3(0, 0, 0),
            axisA: new CANNON.Vec3(0, 0, 1),
            axisB: new CANNON.Vec3(0, 1, 0),
            stiffness,
            relaxation
        });
        this.world.addConstraint(constraints.FL);

        constraints.FR = new CANNON.HingeConstraint(this.carBody, this.wheels.frontRight, {
            pivotA: new CANNON.Vec3(2.15, groundClearance, 1.6),
            pivotB: new CANNON.Vec3(0, 0, 0),
            axisA: new CANNON.Vec3(0, 0, 1),
            axisB: new CANNON.Vec3(0, 1, 0),
            stiffness,
            relaxation
        });
        this.world.addConstraint(constraints.FR);

        constraints.RL = new CANNON.HingeConstraint(this.carBody, this.wheels.rearLeft, {
            pivotA: new CANNON.Vec3(-2.6, groundClearance, -1.6),
            pivotB: new CANNON.Vec3(0, 0, 0),
            axisA: new CANNON.Vec3(0, 0, 1),
            axisB: new CANNON.Vec3(0, 1, 0),
            stiffness,
            relaxation
        });
        constraints.RL.enableMotor();
        constraints.RL.setMotorMaxForce(this.motorForce);
        this.world.addConstraint(constraints.RL);

        constraints.RR = new CANNON.HingeConstraint(this.carBody, this.wheels.rearRight, {
            pivotA: new CANNON.Vec3(-2.6, groundClearance, 1.6),
            pivotB: new CANNON.Vec3(0, 0, 0),
            axisA: new CANNON.Vec3(0, 0, 1),
            axisB: new CANNON.Vec3(0, 1, 0),
            stiffness,
            relaxation
        });
        constraints.RR.enableMotor();
        constraints.RR.setMotorMaxForce(this.motorForce);
        this.world.addConstraint(constraints.RR);

        return constraints;
    }

    createGroundContactMaterial() {
        const wheelGroundContactMaterial = new CANNON.ContactMaterial(this.wheelMaterial, this.groundMaterial, {
            friction: 1,
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

    update() {
        this.steer();
        this.drive();
    }

    steer() {
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

        let ratio = calcSteeringSpeed(this.carBody.velocity.length().toFixed(1),95)
        let actual_angle = this.steeringAngle / -200 * ratio
       
        if (actual_angle === 0) {
            //console.log("zurückgesetzt");
        } else {
            this.constraints.FL.axisA.x = actual_angle;
            this.constraints.FR.axisA.x = actual_angle;
        }
    }
    
    drive() {
    
        if (this.gas == 1) {
            this.constraints.RR.enableMotor();
            this.constraints.RL.enableMotor();
            this.constraints.RR.setMotorMaxForce(this.motorForce);
            this.constraints.RL.setMotorMaxForce(this.motorForce);
            this.constraints.RR.setMotorSpeed(this.speed);
            this.constraints.RL.setMotorSpeed(this.speed);
        } else if (this.gas == -1) {
            this.constraints.RR.enableMotor();
            this.constraints.RL.enableMotor();
            this.constraints.RR.setMotorMaxForce(this.motorForce);
            this.constraints.RL.setMotorMaxForce(this.motorForce);
            this.constraints.RR.setMotorSpeed(this.speed * -1);
            this.constraints.RL.setMotorSpeed(this.speed * -1);
        } else if (this.gas == 0) {
            this.constraints.RR.setMotorMaxForce(this.motorForce*0.25);
            this.constraints.RL.setMotorMaxForce(this.motorForce*0.25);
            this.constraints.RR.setMotorSpeed(0);
            this.constraints.RL.setMotorSpeed(0);
    
        }
    }
}