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
import { GUI } from "three/addons/libs/lil-gui.module.min.js"

// Add helper imports
import { AxesHelper } from "three"
import { BoxHelper } from "three"
import { DirectionalLightHelper } from "three"
import { PointLightHelper } from "three"

class App {
  container
  renderer
  camera
  scene
  controls
  clock
  material
  geometry
  mesh
  stats
  gui
  helpers = {
    axes: null,
    box: null,
    mainLight: null,
    frontLight: null,
    backLight: null,
    point1: null,
    point2: null,
  }
  lights = {
    ambient: undefined,
    main: undefined,
    front: undefined,
    back: undefined,
    point1: undefined,
    point2: undefined,
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
    this.scene.background = new THREE.Color(0x8fbcd4)
    this.clock = new THREE.Clock()

    this.createCamera()
    this.createRenderer()
    this.createControls()
    this.createLight()
    // this.setupPostProcessing()
    // this.createStats()
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
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 20)
    this.camera.position.z = 10
    this.scene.add(this.camera)
  }

  createRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
    })
    this.renderer.setSize(window.innerWidth, window.innerHeight)
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.container.appendChild(this.renderer.domElement)
  }

  createControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableZoom = false
    this.controls.enablePan = false
  }

  createLight() {
    this.scene.add(new THREE.AmbientLight(0x8fbcd4, 1.5))

    const pointLight = new THREE.PointLight(0xffffff, 200)
    this.camera.add(pointLight)
  }

  setupPostProcessing() {
    // const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
    //   type: THREE.HalfFloatType,
    // })
    const renderTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      type: THREE.HalfFloatType,
      depthTexture: new THREE.DepthTexture(window.innerWidth, window.innerHeight),
    })
  }

  createStats() {
    this.stats = new Stats()
    this.container.appendChild(this.stats.dom)
  }

  createMaterial() {
    // this.createGeometry()
    // const material = new THREE.MeshBasicMaterial({ color: 0xffff00 })
    this.material = new THREE.MeshPhongMaterial({
      color: 0xff0000,
      flatShading: true,
    })
    this.geometry = new THREE.CapsuleGeometry(1, 1, 4, 8)
    const morphTarget = this.geometry.clone()

    const position = morphTarget.attributes.position.array

    for (let i = 0; i < position.length; i += 3) {
      position[i + 1] += Math.sin(i * 0.1) * 0.5 // Modify Y coordinate
    }

    morphTarget.setAttribute("morphTarget0", new THREE.Float32BufferAttribute(position, 3))
    this.geometry.morphAttributes.position = [morphTarget.attributes.morphTarget0]

    // this.geometry = new THREE.SphereGeometry(15, 32, 16)
    // this.material = new THREE.MeshBasicMaterial( {color: 0x00ff00} );
    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.scene.add(this.mesh)
  }

  createGeometry() {
    this.geometry = new THREE.SphereGeometry(15, 32, 16)

    // create an empty array to hold targets for the attribute we want to morph
    // morphing positions and normals is supported
    this.geometry.morphAttributes.position = []

    // the original positions of the cube's vertices
    const positionAttribute = this.geometry.attributes.position

    // for the first morph target we'll move the cube's vertices onto the surface of a sphere
    const spherePositions = []

    // for the second morph target, we'll twist the cubes vertices
    const twistPositions = []
    const direction = new THREE.Vector3(1, 0, 0)
    const vertex = new THREE.Vector3()

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i)
      const y = positionAttribute.getY(i)
      const z = positionAttribute.getZ(i)

      spherePositions.push(
        x * Math.sqrt(1 - (y * y) / 2 - (z * z) / 2 + (y * y * z * z) / 3),
        y * Math.sqrt(1 - (z * z) / 2 - (x * x) / 2 + (z * z * x * x) / 3),
        z * Math.sqrt(1 - (x * x) / 2 - (y * y) / 2 + (x * x * y * y) / 3)
      )

      // stretch along the x-axis so we can see the twist better
      vertex.set(x * 2, y, z)

      vertex.applyAxisAngle(direction, (Math.PI * x) / 2).toArray(twistPositions, twistPositions.length)
    }

    // add the spherical positions as the first morph target
    this.geometry.morphAttributes.position[0] = new THREE.Float32BufferAttribute(spherePositions, 3)

    // add the twisted positions as the second morph target
    this.geometry.morphAttributes.position[1] = new THREE.Float32BufferAttribute(twistPositions, 3)
  }

  loadModel() {
    console.log("object")
  }

  onWindowResize() {
    const width = window.innerWidth
    const height = window.innerHeight

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(width, height)
  }

  onDocumentMouseMove(event) {
    this.mouseX = event.clientX - this.windowHalfX
    this.mouseY = event.clientY - this.windowHalfY
  }


  render() {
    const delta = this.clock.getDelta()
    // if (this.controls) {
    //   this.controls.update()
    // }

    // if (this.mesh) {
    //   this.targetX = this.mouseX * 0.001
    //   this.mesh.rotation.y += 0.05 * (this.targetX - this.mesh.rotation.y)
    // }

    // if (this.stats) {
    //   this.stats.update()
    // }
    this.mesh.morphTargetInfluences[0] = (Math.sin(delta) + 1) / 2; // Animate morph influence
    
    this.renderer.render(this.scene, this.camera)
  }

  createGUI() {
    this.gui = new GUI({ title: "Morph Targets" })

    const params = {
      Spherify: 0,
      Twist: 0,
    }
    const morphTargetInfluences = this.mesh.morphTargetInfluences
    console.log("morphTargetInfluences", this.mesh)

    this.gui
      .add(params, "Spherify", 0, 1)
      .step(0.01)
      .onChange(function (value) {
        morphTargetInfluences[0] = value
      })
    this.gui
      .add(params, "Twist", 0, 1)
      .step(0.01)
      .onChange(function (value) {
        morphTargetInfluences[1] = value
      })

    this.gui.close()
  }
}

// Create a new instance of the App class
new App()
