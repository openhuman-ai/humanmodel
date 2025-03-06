import * as THREE from 'three';

class App {
    container;
    renderer;
    camera;
    scene;
    cube;

    constructor() {
        const container = document.querySelector('#scene-container');
        if (!container) throw new Error('Could not find #scene-container');
        this.container = container;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color('skyblue');
        
        this.createCamera();
        this.createRenderer();
        this.createLight();
        this.createMeshes();
        
        this.renderer.setAnimationLoop(() => {
            this.render();
        });
    }
    
    createCamera() {
        this.camera = new THREE.PerspectiveCamera(
            35, // FOV
            window.innerWidth / window.innerHeight, // aspect
            0.1, // near
            100, // far
        );
        this.camera.position.set(0, 0, 10);
    }
    
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
    }
    
    createLight() {
        const light = new THREE.DirectionalLight('white', 8);
        light.position.set(10, 10, 10);
        this.scene.add(light);
        
        const ambientLight = new THREE.AmbientLight('white', 2);
        this.scene.add(ambientLight);
    }
    
    createMeshes() {
        // Add a simple cube as a placeholder
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshStandardMaterial({ color: 'purple' });
        this.cube = new THREE.Mesh(geometry, material);
        this.scene.add(this.cube);
    }
    
    render() {
        // Add simple rotation animation
        if (this.cube) {
            this.cube.rotation.x += 0.01;
            this.cube.rotation.y += 0.01;
        }
        this.renderer.render(this.scene, this.camera);
    }
}

// Create a new instance of the App class
new App(); 