import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/** prevent double init if another bundle loads three */
if (window.__gear3DInitialized) {
  console.warn('[gear3D] already initialized')
} else {
  window.__gear3DInitialized = true
  // run after DOM is ready so the Webflow canvas is present
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
}

function init () {
  // Grab canvas placed in Webflow (or local fallback .webgl)
  const canvas =
    document.getElementById('webgl-canvas') ||
    document.querySelector('canvas.webgl')

  if (!canvas) {
    console.error('❌ Canvas element not found (id="webgl-canvas" or .webgl).')
    return
  }

  const container = canvas.parentElement || document.body

  // Make canvas actually fill the parent and receive pointer input
  if (!getComputedStyle(container).position || getComputedStyle(container).position === 'static') {
    container.style.position = 'relative'
  }
  container.style.overflow = container.style.overflow || 'hidden'
  canvas.style.position = 'absolute'
  canvas.style.inset = '0'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.display = 'block'
  canvas.style.pointerEvents = 'auto'
  canvas.style.zIndex = '1'

  // Scene
  const scene = new THREE.Scene()

  // Lights
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

  // Camera (start with safe defaults; we’ll fit after model loads)
  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1000)
  scene.add(camera)

  // Controls — rotate only
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.enableZoom = false
  controls.enablePan = false
  controls.rotateSpeed = 0.8
  controls.target.set(0, 0, 0)

  // Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  })
  renderer.outputEncoding = THREE.sRGBEncoding
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  // Size from the actual container, not the window
  function resizeToContainer () {
    const rect = container.getBoundingClientRect()
    const w = Math.max(1, Math.floor(rect.width))
    const h = Math.max(1, Math.floor(rect.height))
    renderer.setSize(w, h, false) // keep CSS size; update back buffer only
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }
  resizeToContainer()

  // Model
  const loader = new GLTFLoader()
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const CDN = 'https://single-gear-webflow.vercel.app'
  const modelPath = isLocal ? './models/gear/Gear13.gltf' : `${CDN}/models/gear/Gear13.gltf`

  let gear = null
  let boundRadius = 1

  // Fit object so it fills the div without clipping; uses both V & H FOV.
  function fitCameraTo (radius, margin = 1.28) {
    const vFOV = THREE.MathUtils.degToRad(camera.fov)
    const hFOV = 2 * Math.atan(Math.tan(vFOV / 2) * camera.aspect)

    const distV = (radius * margin) / Math.tan(vFOV / 2)
    const distH = (radius * margin) / Math.tan(hFOV / 2)
    const dist = Math.max(distV, distH)

    camera.position.set(0, 0, dist)
    camera.near = Math.max(0.001, dist / 100)
    camera.far = dist + radius * 10
    camera.updateProjectionMatrix()

    controls.target.set(0, 0, 0)
    controls.update()
  }

  loader.load(
    modelPath,
    (gltf) => {
      gear = gltf.scene

      // Metal look
      gear.traverse((o) => {
        if (o.isMesh) {
          o.material = new THREE.MeshPhysicalMaterial({
            color: 0xb0b0b0,
            metalness: 1,
            roughness: 0.35,
            clearcoat: 0.9,
            clearcoatRoughness: 0.15
          })
          o.castShadow = false
          o.receiveShadow = false
        }
      })

      // Center the model at origin
      const box = new THREE.Box3().setFromObject(gear)
      const center = box.getCenter(new THREE.Vector3())
      gear.position.sub(center)

      // Stand it upright so it spins like a real gear (around Z axis)
      // If your source model is already upright, remove this line.
      gear.rotation.x = -Math.PI / 2

      scene.add(gear)

      // Compute bounding sphere AFTER centering/orientation
      const sphere = new THREE.Sphere()
      new THREE.Box3().setFromObject(gear).getBoundingSphere(sphere)
      boundRadius = sphere.radius

      // Size + camera fit
      resizeToContainer()
      fitCameraTo(boundRadius, 1.28) // tweak margin if you want tighter/looser

      // Let Webflow know
      window.dispatchEvent(new CustomEvent('webglReady'))
    },
    undefined,
    (err) => console.error('❌ Model load error:', err)
  )

  // React to container layout changes (Webflow responsive)
  const ro = new ResizeObserver(() => {
    resizeToContainer()
    if (gear) fitCameraTo(boundRadius, 1.28)
  })
  ro.observe(container)

  // Animation loop
  const clock = new THREE.Clock()
  function animate () {
    const t = clock.getElapsedTime()
    if (gear) {
      gear.rotation.z = t * 0.35 // spin around its axis
    }
    controls.update()
    renderer.render(scene, camera)
    requestAnimationFrame(animate)
  }
  animate()
}
