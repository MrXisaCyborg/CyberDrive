const canvas = document.getElementById('bg');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight, false);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0a0020, 10, 700);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 1.2);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0x39ffd7, 2, 200);
pointLight.position.set(0, 15, 10);
scene.add(pointLight);

// Responsive resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight, false);
});

// Procedural road path function
function roadPath(z) {
  return Math.sin(z * 0.05) * 7;
}

// Create road mesh
function createRoad() {
  const roadGroup = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(16, 200, 8, 30);

  // Adjust vertices to form sinuous path
  for (let i = 0; i < geometry.attributes.position.count; i++) {
    let y = geometry.attributes.position.getY(i);
    let xOffset = roadPath(y);
    geometry.attributes.position.setX(i, geometry.attributes.position.getX(i) + xOffset);
  }
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x101019,
    emissive: 0xff2490,
    emissiveIntensity: 0.14,
    metalness: 0.47,
    roughness: 0.6,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(0, 0.2, 0);
  roadGroup.add(mesh);
  return roadGroup;
}
const road = createRoad();
scene.add(road);

// Car model
const carGeo = new THREE.BoxGeometry(1.05, 0.38, 2.1);
const carMat = new THREE.MeshStandardMaterial({
  color: 0x39ffd7,
  emissive: 0x39ffd7,
  emissiveIntensity: 0.5,
  metalness: 1,
});
const car = new THREE.Mesh(carGeo, carMat);
car.position.set(0, 0.28, 0);
scene.add(car);

// Bike model
function createBike() {
  const bikeGroup = new THREE.Group();

  const frameGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0xff2481,
    emissive: 0xff2481,
    emissiveIntensity: 0.5,
  });
  const frame = new THREE.Mesh(frameGeo, frameMat);
  frame.rotation.z = Math.PI / 2;
  bikeGroup.add(frame);

  const wheelGeo = new THREE.TorusGeometry(0.3, 0.08, 8, 16);
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x39ffd7,
    emissive: 0x39ffd7,
    emissiveIntensity: 0.7,
  });
  const frontWheel = new THREE.Mesh(wheelGeo, wheelMat);
  frontWheel.position.set(0.5, -0.3, 0);
  bikeGroup.add(frontWheel);
  const rearWheel = frontWheel.clone();
  rearWheel.position.set(-0.5, -0.3, 0);
  bikeGroup.add(rearWheel);

  bikeGroup.position.set(0, 0.28, 0);
  return bikeGroup;
}
const bike = createBike();
bike.visible = false;
scene.add(bike);

// Buildings group
const buildingGroup = new THREE.Group();
scene.add(buildingGroup);

function addBuilding(x, z, width, depth, height, color) {
  const geometry = new THREE.BoxGeometry(width, height, depth);
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.9,
    metalness: 0.5,
    roughness: 0.4,
  });
  const building = new THREE.Mesh(geometry, material);
  building.position.set(x, height / 2, z);
  buildingGroup.add(building);
}

function updateBuildings(positionZ) {
  const spacingZ = 25;

  // Remove buildings too far back
  buildingGroup.children = buildingGroup.children.filter(
    (b) => b.position.z > positionZ - 100
  );

  for (let z = positionZ + 50; z < positionZ + 150; z += spacingZ) {
    if (!buildingGroup.children.some((b) => Math.abs(b.position.z - z) < 5)) {
      const height = 5 + Math.random() * 15;
      const offset = 10 + Math.random() * 8;
      addBuilding(-offset, z, 5 + Math.random() * 3, 5 + Math.random() * 3, height, 0xff2481); // Pink neon
      addBuilding(offset, z, 4 + Math.random() * 3, 4 + Math.random() * 3, height * 0.8, 0x39ffd7); // Cyan neon
    }
  }
}

let pulseDirection = 1;
function pulseEmissiveIntensity(material, min = 0.3, max = 0.8, speed = 0.006) {
  material.emissiveIntensity += pulseDirection * speed;
  if (material.emissiveIntensity >= max) pulseDirection = -1;
  if (material.emissiveIntensity <= min) pulseDirection = 1;
}

// Vehicle and input handling
let vehicleType = null;
let vehicle = null; // Current vehicle mesh or group
let steer = 0;
let progress = 0;

window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') steer = -1;
  if (e.key === 'ArrowRight') steer = 1;
});
window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') steer = 0;
});

// Touch input for mobile
let startX = null;
canvas.addEventListener('touchstart', (e) => {
  startX = e.touches[0].clientX;
});
canvas.addEventListener('touchmove', (e) => {
  if (!startX) return;
  let dx = e.touches[0].clientX - startX;
  if (Math.abs(dx) > 40) {
    steer = dx < 0 ? -1 : 1;
    startX = e.touches[0].clientX;
  }
});
canvas.addEventListener('touchend', (e) => {
  steer = 0;
});

function selectVehicle(type) {
  vehicleType = type;
  document.getElementById('menu').style.display = 'none';

  if (vehicle) scene.remove(vehicle);
  if (type === 'car') {
    vehicle = car;
    car.visible = true;
    bike.visible = false;
    scene.add(car);
  } else {
    vehicle = bike;
    bike.visible = true;
    car.visible = false;
    scene.add(bike);
  }

  progress = 0;
  animate();
}

// Animate loop
function animate() {
  if (!vehicleType) return; // Wait until vehicle selected

  requestAnimationFrame(animate);

  progress += 0.17;

  // Steering control limits position
  vehicle.position.x += steer * (vehicleType === 'car' ? 0.18 : 0.21);
  vehicle.position.x = Math.min(7, Math.max(-7, vehicle.position.x));

  // Forward progress with road curvature adjustment
  const pathX = roadPath(progress);
  vehicle.position.z = progress;

  // Camera follows vehicle
  camera.position.set(vehicle.position.x, 2.5, vehicle.position.z - 9);
  camera.lookAt(vehicle.position.x, 0.2, vehicle.position.z + 15);

  road.position.z = (progress % 120) - 60;

  updateBuildings(progress);

  buildingGroup.children.forEach((b) => pulseEmissiveIntensity(b.material, 0.4, 1, 0.005));
  if (vehicle.material) {
    pulseEmissiveIntensity(vehicle.material, 0.3, 0.9, 0.008);
  } else if (vehicle.children && vehicle.children.length) {
    pulseEmissiveIntensity(vehicle.children[0].material, 0.3, 0.9, 0.008);
  }

  renderer.render(scene, camera);
}


