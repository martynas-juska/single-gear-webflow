import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

if (!window.__gear3DInitialized) {
  window.__gear3DInitialized = true

  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
}

function init() {
  // --- Main Webflow setup ---
  let container = document.getElementById('single-gear')
  let canvas = document.getElementById('webgl-canvas')

  // --- 🧩 Local fallback for Vite preview ---
  if (!container) {
    console.warn('⚠️ #single-gear not found — running in local Vite mode.')
    container = document.body
  }
  if (!canvas) {
    console.warn('⚠️ #webgl-canvas not found — using .webgl fallback.')
    canvas = document.querySelector('canvas.webgl')
    if (!canvas) {
      canvas = document.createElement('canvas')
      canvas.className = 'webgl'
      document.body.appendChild(canvas)
    }
  }

  // === Style setup ===
  container.style.position = container.style.position || 'relative'
  container.style.overflow = container.style.overflow || 'hidden'
  canvas.style.position = 'absolute'
  canvas.style.top = '0'
  canvas.style.left = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.display = 'block'
  canvas.style.pointerEvents = 'auto'

  // === Scene ===
  const scene = new THREE.Scene()

  // === Lights ===
  scene.add(new THREE.AmbientLight(0x557799, 0.6))
  const keyLight = new THREE.DirectionalLight(0xffffff, 2)
  keyLight.position.set(4, 4, 2)
  scene.add(keyLight)
  const blueLight = new THREE.PointLight(0x5ac8fa, 3, 10)
  blueLight.position.set(-3, 1.5, -2)
  scene.add(blueLight)
  const fillLight = new THREE.PointLight(0x99ccff, 1.0, 8)
  fillLight.position.set(0, -1, 3)
  scene.add(fillLight)

  // === Camera ===
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000)
  scene.add(camera)

  // === Controls ===
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.enableZoom = false
  controls.enablePan = false
  controls.rotateSpeed = 0.8
  controls.target.set(0, 0, 0)
  controls.update()

  // === Renderer ===
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  })
  renderer.outputEncoding = THREE.sRGBEncoding
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // === Resize ===
  function resize() {
    const width = container.clientWidth || window.innerWidth
    const height = container.clientHeight || window.innerHeight
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
  }

  resize()
  new ResizeObserver(resize).observe(container)

  // === Load Model ===
  const loader = new GLTFLoader()
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const CDN = 'https://single-gear-webflow.vercel.app'
  const modelPath = isLocal ? './models/gear/Gear13.gltf' : `${CDN}/models/gear/Gear13.gltf`

  let gear = null

  loader.load(
    modelPath,
    (gltf) => {
      gear = gltf.scene

      // Material
      gear.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshPhysicalMaterial({
            color: 0xb0b0b0,
            metalness: 1,
            roughness: 0.35,
            clearcoat: 0.9,
            clearcoatRoughness: 0.15
          })
        }
      })

      // Center + upright
      const box = new THREE.Box3().setFromObject(gear)
      const center = box.getCenter(new THREE.Vector3())
      gear.position.sub(center)
      gear.rotation.x = -Math.PI / 2
      scene.add(gear)

      // Fit camera
      const sphere = new THREE.Sphere()
      new THREE.Box3().setFromObject(gear).getBoundingSphere(sphere)
      const radius = sphere.radius
      const fov = THREE.MathUtils.degToRad(camera.fov)
      const distance = (radius * 1.4) / Math.tan(fov / 2)
      camera.position.set(0, 0, distance)
      camera.lookAt(0, 0, 0)

      window.dispatchEvent(new CustomEvent('webglReady'))
    },
    undefined,
    (err) => console.error('❌ Model load error:', err)
  )

  // === Animate ===
  const clock = new THREE.Clock()
  function animate() {
    const t = clock.getElapsedTime()
    if (gear) gear.rotation.z = t * 0.3
    controls.update()
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  animate()
}
