import {
  LoadingManager,
  Scene,
  Color,
  Clock,
  WebGLRenderer,
  PMREMGenerator,
  PerspectiveCamera,
  ACESFilmicToneMapping,
  DirectionalLight,
  AmbientLight,
  AnimationMixer,
} from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js"
import { KTX2Loader } from "three/addons/loaders/KTX2Loader.js"
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js"
import { GUI } from "three/addons/libs/lil-gui.module.min.js"

// Create loading manager
const loadingManager = new LoadingManager()
loadingManager.onProgress = (url, loaded, total) => {
  console.log(`Loading file: ${url}.\nLoaded ${loaded} of ${total} files.`)
}

const MODEL_PATH = new URL("/models/facecap.glb", import.meta.url).href

class App {
  canvas
  renderer
  camera
  scene
  mixer
  controls
  clock
  model
  meshWithMorphTargets
  gui
  morphTargetFolder

  constructor() {
    const canvas = document.querySelector("#scene-container")
    if (!canvas) throw new Error("Could not find #scene-container")
    this.canvas = canvas
    this.scene = new Scene()
    this.scene.background = new Color("white")
    this.clock = new Clock()

    this.renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
    })
    const pmremGenerator = new PMREMGenerator(this.renderer)
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment()).texture

    this.createCamera()
    this.setupGUI()
    this.createRenderer()
    this.createControls()
    this.createLight()
    this.loadModel()

    window.addEventListener("resize", this.onWindowResize.bind(this), false)

    this.renderer.setAnimationLoop(() => {
      this.render()
    })
  }

  createCamera() {
    this.camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20)
    this.camera.position.set(-1, 0.8, 5)
  }

  createRenderer() {
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.canvas.appendChild(this.renderer.domElement)
  }

  createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.minDistance = 2.5
    this.controls.maxDistance = 5
    this.controls.minAzimuthAngle = -Math.PI / 2
    this.controls.maxAzimuthAngle = Math.PI / 2
    this.controls.maxPolarAngle = Math.PI / 1.8
    this.controls.target.set(0, 0.15, -0.2)

    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.screenSpacePanning = true
  }

  createLight() {
    const light = new DirectionalLight("white", 8)
    light.position.set(10, 10, 10)
    this.scene.add(light)

    const ambientLight = new AmbientLight("white", 2)
    this.scene.add(ambientLight)
  }

  async loadModel() {
    // const ktx2Loader = new KTX2Loader(loadingManager)
    //   .setTranscoderPath("three/examples/jsm/libs/basis/")
    //   .detectSupport(this.renderer)
    const ktx2Loader = new KTX2Loader(loadingManager).setTranscoderPath("/libs/basis/").detectSupport(this.renderer)

    const loader = new GLTFLoader(loadingManager)
    loader.setKTX2Loader(ktx2Loader)
    loader.setMeshoptDecoder(MeshoptDecoder)

    loader.load(MODEL_PATH, (gltf) => {
      //   this.model = gltf.scene
      const mesh = gltf.scene.children[0]
      this.mixer = new AnimationMixer(mesh)
      this.mixer.clipAction(gltf.animations[0]).play()
      const head = mesh.getObjectByName("mesh_2")
      const influences = head.morphTargetInfluences

      //   // Center the model
      //   const box = new Box3().setFromObject(this.model)
      //   const center = box.getCenter(new Vector3())
      //   this.model.position.sub(center)

      //   // Setup morph targets
      //   this.model.traverse((node) => {
      //     if (node.isMesh && node.morphTargetDictionary) {
      //       this.meshWithMorphTargets = node
      //     }
      //   })

      // // Handle animations
      // if (gltf.animations?.length) {
      //   this.mixer = new AnimationMixer(this.model)
      //   this.animations = gltf.animations
      //   this.animations.forEach((clip) => {
      //     this.mixer.clipAction(clip).play()
      //   })
      // }

      for (const [key, value] of Object.entries(head.morphTargetDictionary)) {
        this.morphTargetFolder.add(influences, value, 0, 1, 0.01).name(key.replace("blendShape1.", "")).listen()
      }
      //   this.gui.close()
      this.scene.add(mesh)

      //   this.scene.add(this.model)

      // Update GUI after model is loaded
      if (this.meshWithMorphTargets) {
        this.updateMorphTargetGUI()
      }
    })
  }

  setupGUI() {
    this.gui = new GUI()

    // Add camera controls
    const cameraFolder = this.gui.addFolder("Camera")
    cameraFolder.add(this.camera.position, "x", -5, 5, 0.1).name("Position X")
    cameraFolder.add(this.camera.position, "y", -5, 5, 0.1).name("Position Y")
    cameraFolder.add(this.camera.position, "z", -5, 5, 0.1).name("Position Z")
    cameraFolder.close()

    this.morphTargetFolder = this.gui.addFolder("Morph Targets")
    this.morphTargetFolder.close()
  }

  updateMorphTargetGUI() {
    if (!this.meshWithMorphTargets) return

    const morphDict = this.meshWithMorphTargets.morphTargetDictionary
    const morphTargets = {}

    // Create controls for each morph target
    for (const [key, index] of Object.entries(morphDict)) {
      morphTargets[key] = 0
      this.morphTargetFolder.add(morphTargets, key, 0, 1, 0.01).onChange((value) => {
        this.meshWithMorphTargets.morphTargetInfluences[index] = value
      })
    }
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(window.innerWidth, window.innerHeight)
  }

  render() {
    const delta = this.clock.getDelta()

    if (this.mixer) {
      this.mixer.update(delta)
    }

    if (this.controls) {
      this.controls.update()
    }

    this.renderer.render(this.scene, this.camera)
  }
}

// Create a new instance of the App class
new App()
