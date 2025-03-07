import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

import Stats from "three/addons/libs/stats.module.js"

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js"
import { RenderPass } from "three/addons/postprocessing/RenderPass.js"
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js"
import { BleachBypassShader } from "three/addons/shaders/BleachBypassShader.js"
import { ColorCorrectionShader } from "three/addons/shaders/ColorCorrectionShader.js"
import { FXAAShader } from "three/addons/shaders/FXAAShader.js"
import { GammaCorrectionShader } from "three/addons/shaders/GammaCorrectionShader.js"

// Create loading manager
const loadingManager = new THREE.LoadingManager()
loadingManager.onProgress = (url, loaded, total) => {
  //   console.log(`Loading file: ${url}.\nLoaded ${loaded} of ${total} files.`)
}

// const MODEL_PATH = new URL("/models/Thanh.glb", import.meta.url).href
const MODEL_PATH = new URL("/models/LeePerrySmith/LeePerrySmith.glb", import.meta.url).href

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
    this.scene.background = new THREE.Color("white")
    this.clock = new THREE.Clock()

    this.createCamera()
    this.createRenderer()
    this.createControls()
    this.createLight()
    this.setupPostProcessing()
    this.createStats()
    this.createMaterial()
    this.loadModel()

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
  }

  createLight() {
    // Ambient light for overall scene illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(ambientLight)

    // Main directional light (like sun)
    const mainLight = new THREE.DirectionalLight(0xffffff, 1)
    mainLight.position.set(0, 5, 10)
    this.scene.add(mainLight)

    // Fill light from the front
    const frontLight = new THREE.DirectionalLight(0xffffff, 0.7)
    frontLight.position.set(0, 0, 1)
    this.scene.add(frontLight)

    // Back light for rim lighting
    const backLight = new THREE.DirectionalLight(0xffffff, 0.5)
    backLight.position.set(0, 0, -5)
    this.scene.add(backLight)

    // Add point lights for additional detail
    const pointLight1 = new THREE.PointLight(0xffffff, 1, 1000)
    pointLight1.position.set(2, 2, 2)
    this.scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xffffff, 1, 1000)
    pointLight2.position.set(-2, 2, -2)
    this.scene.add(pointLight2)

    // this.loader = new GLTFLoader()
    // this.loader.load("/models/LeePerrySmith/LeePerrySmith.glb", function (gltf) {
    //   createScene(gltf.scene.children[0].geometry, 100, material)
    // })

    // renderer = new THREE.WebGLRenderer()
    // renderer.setSize(window.innerWidth, window.innerHeight)
    // container.appendChild(renderer.domElement)
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

    const colorTexture = textureLoader.load("/models/LeePerrySmith/Map-COL.jpg")
    colorTexture.colorSpace = THREE.SRGBColorSpace

    const roughnessTexture = textureLoader.load("/models/LeePerrySmith/Map-ROUGH.jpg")
    roughnessTexture.colorSpace = THREE.SRGBColorSpace

    const metalnessTexture = textureLoader.load("/models/LeePerrySmith/Map-METAL.jpg")
    metalnessTexture.colorSpace = THREE.SRGBColorSpace
    const diffuseMap = textureLoader.load("/models/LeePerrySmith/Map-COL.jpg")
    diffuseMap.colorSpace = THREE.SRGBColorSpace

    const specularMap = textureLoader.load("/models/LeePerrySmith/Map-SPEC.jpg")
    specularMap.colorSpace = THREE.SRGBColorSpace

    const normalMap = textureLoader.load("/models/LeePerrySmith/Infinite-Level_02_Tangent_SmoothUV.jpg")

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

      // this.scene.add(this.model)
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
      this.targetY = this.mouseY * 0.001
      this.model.rotation.y += 0.05 * (this.targetX - this.model.rotation.y)
      this.model.rotation.x += 0.05 * (this.targetY - this.model.rotation.x)
    }

    this.composer.render()

    if (this.stats) {
      this.stats.update()
    }
  }
}

// Create a new instance of the App class
new App()
