import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from "three/addons/libs/stats.module.js"

import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js"
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js"

import { GUI } from "three/addons/libs/lil-gui.module.min.js"

// Create loading manager
const loadingManager = new THREE.LoadingManager();
loadingManager.onProgress = (url, loaded, total) => {
    console.log(`Loading file: ${url}.\nLoaded ${loaded} of ${total} files.`);
};

const MODEL_PATH = new URL('/models/facecap.glb', import.meta.url).href;

class App {
    container;
    renderer;
    camera;
    scene;
    mixer;
    controls;
    clock;
    model;

    constructor() {
        const container = document.querySelector('#scene-container');
        if (!container) throw new Error('Could not find #scene-container');
        this.container = container;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('white');
        this.clock = new THREE.Clock();
        
        this.createCamera();
        this.createRenderer();
        this.createControls();
        this.createLight();
        this.loadModel();
        
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
        
        this.renderer.setAnimationLoop(() => {
            this.render();
        });
    }
    
    createCamera() {
        this.camera = new THREE.PerspectiveCamera(
            35, // FOV
            window.innerWidth / window.innerHeight, // aspect
            0.1, // near
            1000, // far
        );
        this.camera.position.set(0, 1, 5);
    }
    
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true 
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.physicallyCorrectLights = true;
        this.container.appendChild(this.renderer.domElement);
    }

    createControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = true;
    }
    
    createLight() {
        const light = new THREE.DirectionalLight('white', 8);
        light.position.set(10, 10, 10);
        this.scene.add(light);
        
        const ambientLight = new THREE.AmbientLight('white', 2);
        this.scene.add(ambientLight);
    }
    
    loadModel() {
        const loader = new GLTFLoader(loadingManager);
        const dracoLoader = new DRACOLoader(loadingManager);
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        loader.setDRACOLoader(dracoLoader);

        loader.load(MODEL_PATH, (gltf) => {
            this.model = gltf.scene;
            
            // Center the model
            const box = new THREE.Box3().setFromObject(this.model);
            const center = box.getCenter(new THREE.Vector3());
            this.model.position.sub(center); // Simpler centering
            
            // Handle animations
            if (gltf.animations?.length) {
                this.mixer = new THREE.AnimationMixer(this.model);
                gltf.animations.forEach(clip => {
                    this.mixer.clipAction(clip).play();
                });
            }
            
            this.scene.add(this.model);
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    render() {
        const delta = this.clock.getDelta();
        
        if (this.mixer) {
            this.mixer.update(delta);
        }
        
        if (this.controls) {
            this.controls.update();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Create a new instance of the App class
new App(); 