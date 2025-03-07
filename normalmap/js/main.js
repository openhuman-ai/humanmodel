import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { GUI } from "three/addons/libs/lil-gui.module.min.js"

import Stats from "three/addons/libs/stats.module.js"

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"
import { RenderPass } from "three/addons/postprocessing/RenderPass.js"
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js"
import { BleachBypassShader } from "three/addons/shaders/BleachBypassShader.js"
import { ColorCorrectionShader } from "three/addons/shaders/ColorCorrectionShader.js"
import { FXAAShader } from "three/addons/shaders/FXAAShader.js"
import { GammaCorrectionShader } from "three/addons/shaders/GammaCorrectionShader.js"

// Add helper imports
import { AxesHelper } from 'three'
import { BoxHelper } from 'three'
import { DirectionalLightHelper } from 'three'
import { PointLightHelper } from 'three'

// Create loading manager
const loadingManager = new THREE.LoadingManager()
loadingManager.onProgress = (url, loaded, total) => {
  //   console.log(`Loading file: ${url}.\nLoaded ${loaded} of ${total} files.`)
}

const MODEL_PATH = "/models/LeePerrySmith/LeePerrySmith.glb"
const TEXTURE_BASE_PATH = "/models/LeePerrySmith"

class App {
  container
  renderer
  camera
  scene
  mixer
  controls
  clock
  material
  model
  composer
  effectFXAA
  stats
  gui
  helpers = {
    axes: null,
    box: null,
    mainLight: null,
    frontLight: null,
    backLight: null,
    point1: null,
    point2: null
  }
  lights = {
    ambient: undefined,
    main: undefined,
    front: undefined,
    back: undefined,
    point1: undefined,
    point2: undefined
  }

  mouseX = 0
  mouseY = 0
  targetX = 0
  targetY = 0
  windowHalfX = window.innerWidth / 2
  windowHalfY = window.innerHeight / 2

  constructor() {
    const container = document.querySelector("#scene-container")
    if (!container) throw new Error("Could not find #scene-container")
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color("#fff")
    this.clock = new THREE.Clock()

    this.createCamera()
    this.createRenderer()
    this.createControls()
    this.createLight()
    this.setupPostProcessing()
    this.createStats()
    this.createMaterial()
    this.loadModel()
    this.createGUI()

    window.addEventListener("resize", this.onWindowResize.bind(this), false)
    document.addEventListener("mousemove", this.onDocumentMouseMove.bind(this))

    this.renderer.setAnimationLoop(() => {
      this.render()
    })
  }

  createCamera() {
    this.camera = new THREE.PerspectiveCamera(27, window.innerWidth / window.innerHeight, 1, 10000)
    this.camera.position.set(0, 0, 1000)
    // this.camera.position.set(0, 0, 20)
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.autoClear = false
    this.container.appendChild(this.renderer.domElement)
  }

  createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.screenSpacePanning = true
    
    // Restrict rotation to horizontal only
    this.controls.minPolarAngle = Math.PI / 2 // 90 degrees
    this.controls.maxPolarAngle = Math.PI / 2 // 90 degrees
    
    // Optional: Limit the horizontal rotation if needed
    // this.controls.minAzimuthAngle = -Math.PI / 4 // -45 degrees
    // this.controls.maxAzimuthAngle = Math.PI / 4  // 45 degrees
    
    // Disable zoom if you want to keep fixed distance
    this.controls.enableZoom = false
    
    // Disable panning
    this.controls.enablePan = false
  }

  createLight() {
    // Ambient light for overall scene illumination
    this.lights.ambient = new THREE.AmbientLight(0xffffff, 2)
    this.scene.add(this.lights.ambient)

    // Main directional light (like sun)
    this.lights.main = new THREE.DirectionalLight(0xffffff, 1)
    this.lights.main.position.set(0, 5, 10)
    this.scene.add(this.lights.main)

    // Fill light from the front
    this.lights.front = new THREE.DirectionalLight(0xffffff, 0.7)
    this.lights.front.position.set(0, 0, 1)
    this.scene.add(this.lights.front)

    // Back light for rim lighting
    this.lights.back = new THREE.DirectionalLight(0xffffff, 0.5)
    this.lights.back.position.set(0, 0, -5)
    this.scene.add(this.lights.back)

    // Add point lights for additional detail
    this.lights.point1 = new THREE.PointLight(0xffffff, 1, 1000)
    this.lights.point1.position.set(2, 2, 2)
    this.scene.add(this.lights.point1)

    this.lights.point2 = new THREE.PointLight(0xffffff, 1, 1000)
    this.lights.point2.position.set(-2, 2, -2)
    this.scene.add(this.lights.point2)

    // Create helpers for lights
    this.helpers.mainLight = new DirectionalLightHelper(this.lights.main, 5)
    this.scene.add(this.helpers.mainLight)

    this.helpers.frontLight = new DirectionalLightHelper(this.lights.front, 5)
    this.scene.add(this.helpers.frontLight)

    this.helpers.backLight = new DirectionalLightHelper(this.lights.back, 5)
    this.scene.add(this.helpers.backLight)

    this.helpers.point1 = new PointLightHelper(this.lights.point1, 2)
    this.scene.add(this.helpers.point1)

    this.helpers.point2 = new PointLightHelper(this.lights.point2, 2)
    this.scene.add(this.helpers.point2)
  }

  setupPostProcessing() {
    // const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    //   type: THREE.HalfFloatType,
    // })
    const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      type: THREE.HalfFloatType,
      depthTexture: new THREE.DepthTexture(window.innerWidth, window.innerHeight),
    })

    this.composer = new EffectComposer(this.renderer, renderTarget)

    const renderModel = new RenderPass(this.scene, this.camera)
    const effectBleach = new ShaderPass(BleachBypassShader)
    const effectColor = new ShaderPass(ColorCorrectionShader)
    this.effectFXAA = new ShaderPass(FXAAShader)
    const gammaCorrection = new ShaderPass(GammaCorrectionShader)

    this.effectFXAA.uniforms["resolution"].value.set(1 / window.innerWidth, 1 / window.innerHeight)
    effectBleach.uniforms["opacity"].value = 0.2
    effectColor.uniforms["powRGB"].value.set(1.4, 1.45, 1.45)
    effectColor.uniforms["mulRGB"].value.set(1.1, 1.1, 1.1)

    this.composer.addPass(renderModel)
    this.composer.addPass(this.effectFXAA)
    this.composer.addPass(effectBleach)
    this.composer.addPass(effectColor)
    this.composer.addPass(gammaCorrection)
  }

  createStats() {
    this.stats = new Stats()
    this.container.appendChild(this.stats.dom)
  }

  createMaterial() {
    const textureLoader = new THREE.TextureLoader()

    const colorTexture = textureLoader.load(`${TEXTURE_BASE_PATH}/Map-COL.jpg`)
    colorTexture.colorSpace = THREE.SRGBColorSpace

    const roughnessTexture = textureLoader.load(`${TEXTURE_BASE_PATH}/Map-ROUGH.jpg`)
    roughnessTexture.colorSpace = THREE.SRGBColorSpace

    const metalnessTexture = textureLoader.load(`${TEXTURE_BASE_PATH}/Map-METAL.jpg`)
    metalnessTexture.colorSpace = THREE.SRGBColorSpace
    const diffuseMap = textureLoader.load(`${TEXTURE_BASE_PATH}/Map-COL.jpg`)
    diffuseMap.colorSpace = THREE.SRGBColorSpace

    const specularMap = textureLoader.load(`${TEXTURE_BASE_PATH}/Map-SPEC.jpg`)
    specularMap.colorSpace = THREE.SRGBColorSpace

    const normalMap = textureLoader.load(`${TEXTURE_BASE_PATH}/Infinite-Level_02_Tangent_SmoothUV.jpg`)

    this.material = new THREE.MeshPhongMaterial({
      color: 0xdddddd,
      specular: 0x222222,
      shininess: 35,
      map: diffuseMap,
      specularMap: specularMap,
      normalMap: normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
    })
  }

  loadModel() {
    const loader = new GLTFLoader(loadingManager)
    const dracoLoader = new DRACOLoader(loadingManager)
    dracoLoader.setDecoderPath("https://www.gstatic.com/draco/v1/decoders/")
    loader.setDRACOLoader(dracoLoader)

    loader.load(MODEL_PATH, (gltf) => {
      this.model = gltf.scene

      const firstChild = gltf.scene.children[0]
      const geometry = firstChild instanceof THREE.Mesh ? firstChild.geometry : null

      // Center the model
      const box = new THREE.Box3().setFromObject(this.model)
      const center = box.getCenter(new THREE.Vector3())
      this.model.position.sub(center)

      // // Handle animations
      // if (gltf.animations?.length) {
      //   this.mixer = new THREE.AnimationMixer(this.model)
      //   gltf.animations.forEach((clip) => {
      //     this.mixer.clipAction(clip).play()
      //   })
      // }
      // console.log("this.material", this.material)

      console.log("geometry", geometry)

      const mesh = new THREE.Mesh(geometry, this.material)
      // mesh = new THREE.Mesh(geometry, material)
      const scale = 50

      mesh.position.y = -20
      mesh.scale.x = mesh.scale.y = mesh.scale.z = scale

      // Add axes helper
      this.helpers.axes = new AxesHelper(100)
      this.scene.add(this.helpers.axes)

      // Add box helper
      this.helpers.box = new BoxHelper(mesh, 0xffff00)
      this.scene.add(this.helpers.box)

      this.scene.add(mesh)
    })
  }

  onWindowResize() {
    const width = window.innerWidth
    const height = window.innerHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height)
    this.composer.setSize(width, height)

    if (this.effectFXAA) {
      this.effectFXAA.uniforms["resolution"].value.set(1 / width, 1 / height)
    }
  }

  onDocumentMouseMove(event) {
    this.mouseX = event.clientX - this.windowHalfX
    this.mouseY = event.clientY - this.windowHalfY
  }

  render() {
    const delta = this.clock.getDelta()

    if (this.mixer) {
      this.mixer.update(delta)
    }

    if (this.controls) {
      this.controls.update()
    }

    if (this.model) {
      this.targetX = this.mouseX * 0.001
      this.model.rotation.y += 0.05 * (this.targetX - this.model.rotation.y)
    }

    // Update helpers
    if (this.helpers.box) this.helpers.box.update()
    if (this.helpers.mainLight) this.helpers.mainLight.update()
    if (this.helpers.frontLight) this.helpers.frontLight.update()
    if (this.helpers.backLight) this.helpers.backLight.update()

    this.composer.render()

    if (this.stats) {
      this.stats.update()
    }
  }

  createGUI() {
    this.gui = new GUI()

    // Add helper visibility controls
    const helperFolder = this.gui.addFolder('Helpers')
    helperFolder.add({ showAxes: true }, 'showAxes')
      .onChange((visible) => {
        if (this.helpers.axes) this.helpers.axes.visible = visible
      })
    helperFolder.add({ showBox: true }, 'showBox')
      .onChange((visible) => {
        if (this.helpers.box) this.helpers.box.visible = visible
      })
    helperFolder.add({ showLightHelpers: true }, 'showLightHelpers')
      .onChange((visible) => {
        if (this.helpers.mainLight) this.helpers.mainLight.visible = visible
        if (this.helpers.frontLight) this.helpers.frontLight.visible = visible
        if (this.helpers.backLight) this.helpers.backLight.visible = visible
        if (this.helpers.point1) this.helpers.point1.visible = visible
        if (this.helpers.point2) this.helpers.point2.visible = visible
      })

    // Ambient Light controls
    const ambientFolder = this.gui.addFolder('Ambient Light')
    ambientFolder.add(this.lights.ambient, 'intensity', 0, 2).name('Intensity')
    ambientFolder.addColor(this.lights.ambient, 'color').name('Color')

    // Main Light controls
    const mainFolder = this.gui.addFolder('Main Light')
    mainFolder.add(this.lights.main, 'intensity', 0, 2).name('Intensity')
    mainFolder.addColor(this.lights.main, 'color').name('Color')
    mainFolder.add(this.lights.main.position, 'x', -10, 10).name('Position X')
    mainFolder.add(this.lights.main.position, 'y', -10, 10).name('Position Y')
    mainFolder.add(this.lights.main.position, 'z', -10, 10).name('Position Z')

    // Front Light controls
    const frontFolder = this.gui.addFolder('Front Light')
    frontFolder.add(this.lights.front, 'intensity', 0, 2).name('Intensity')
    frontFolder.addColor(this.lights.front, 'color').name('Color')
    frontFolder.add(this.lights.front.position, 'x', -10, 10).name('Position X')
    frontFolder.add(this.lights.front.position, 'y', -10, 10).name('Position Y')
    frontFolder.add(this.lights.front.position, 'z', -10, 10).name('Position Z')

    // Back Light controls
    const backFolder = this.gui.addFolder('Back Light')
    backFolder.add(this.lights.back, 'intensity', 0, 2).name('Intensity')
    backFolder.addColor(this.lights.back, 'color').name('Color')
    backFolder.add(this.lights.back.position, 'x', -10, 10).name('Position X')
    backFolder.add(this.lights.back.position, 'y', -10, 10).name('Position Y')
    backFolder.add(this.lights.back.position, 'z', -10, 10).name('Position Z')

    // Point Light 1 controls
    const point1Folder = this.gui.addFolder('Point Light 1')
    point1Folder.add(this.lights.point1, 'intensity', 0, 2).name('Intensity')
    point1Folder.addColor(this.lights.point1, 'color').name('Color')
    point1Folder.add(this.lights.point1.position, 'x', -10, 10).name('Position X')
    point1Folder.add(this.lights.point1.position, 'y', -10, 10).name('Position Y')
    point1Folder.add(this.lights.point1.position, 'z', -10, 10).name('Position Z')
    point1Folder.add(this.lights.point1, 'distance', 0, 2000).name('Distance')

    // Point Light 2 controls
    const point2Folder = this.gui.addFolder('Point Light 2')
    point2Folder.add(this.lights.point2, 'intensity', 0, 2).name('Intensity')
    point2Folder.addColor(this.lights.point2, 'color').name('Color')
    point2Folder.add(this.lights.point2.position, 'x', -10, 10).name('Position X')
    point2Folder.add(this.lights.point2.position, 'y', -10, 10).name('Position Y')
    point2Folder.add(this.lights.point2.position, 'z', -10, 10).name('Position Z')
    point2Folder.add(this.lights.point2, 'distance', 0, 2000).name('Distance')
  }
}

// Create a new instance of the App class
new App()
