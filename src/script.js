import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * Prevent multiple Three.js initializations
 */
if (window.__gear3DInitialized) {
  console.warn('⚠️ Gear 3D already initialized — skipping duplicate setup.')
} else {
  window.__gear3DInitialized = true

  /**
   * Detect environment
   */
  let container = document.getElementById('single-gear')
  let canvas

  if (container) {
    canvas = document.createElement('canvas')
    canvas.classList.add('webgl')
    canvas.style.opacity = '0'
    canvas.style.transition = 'opacity 0.8s ease'
    container.appendChild(canvas)
  } else {
    canvas = document.querySelector('canvas.webgl')
    container = document.body
  }

  /**
   * Scene — transparent background to blend with Webflow
   */
  const scene = new THREE.Scene()

  /**
   * Lights — cinematic mix of warm + cool tones
   */
  const ambientLight = new THREE.AmbientLight(0x557799, 0.6)
  scene.add(ambientLight)

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.0)
  keyLight.position.set(4, 4, 2)
  keyLight.castShadow = true
  keyLight.shadow.mapSize.set(1024, 1024)
  scene.add(keyLight)

  const blueLight = new THREE.PointLight(0x5ac8fa, 3, 10)
  blueLight.position.set(-3, 1.5, -2)
  scene.add(blueLight)

  const fillLight = new THREE.PointLight(0x99ccff, 1.0, 8)
  fillLight.position.set(0, -1, 3)
  scene.add(fillLight)

  /**
   * GLTF Loader — texture-free metallic look
   */
  const gltfLoader = new GLTFLoader()
  let gear = null
  let modelLoaded = false

  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const VERCEL_CDN = 'https://single-gear-webflow.vercel.app'
  const modelPath = isLocal
    ? './models/gear/Gear13.gltf'
    : `${VERCEL_CDN}/models/gear/Gear13.gltf`

  gltfLoader.load(
    modelPath,
    (gltf) => {
      gear = gltf.scene
      gear.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          child.material = new THREE.MeshPhysicalMaterial({
            color: 0xb0b0b0,
            metalness: 1.0,
            roughness: 0.35,
            clearcoat: 0.9,
            clearcoatRoughness: 0.15,
            reflectivity: 0.9,
            sheen: 0.1,
            envMapIntensity: 1.0
          })
        }
      })

      // Scale fix: slightly larger
      gear.position.set(0, 0, 0)
      gear.rotation.x = Math.PI * 0.5
      gear.scale.set(0.8, 0.8, 0.8)
      scene.add(gear)

      modelLoaded = true

      // Fade in and signal Webflow
      requestAnimationFrame(() => {
        canvas.style.opacity = '1'
        window.dispatchEvent(new CustomEvent('webglReady'))
      })
    },
    undefined,
    (error) => console.error('❌ Error loading model:', error)
  )

  /**
   * Camera
   */
  const sizes = {
    width: container.clientWidth || window.innerWidth,
    height: container.clientHeight || window.innerHeight
  }

  const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 100)
  camera.position.set(2.2, 1.8, 2.2)
  scene.add(camera)

  /**
   * Controls — rotation only
   */
  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.enableZoom = false
  controls.enableRotate = true
  controls.target.set(0, 0.3, 0)

  /**
   * Renderer
   */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance'
  })
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.outputEncoding = THREE.sRGBEncoding
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

  /**
   * Resize handling
   */
  if (container !== document.body) {
    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth
      const height = container.clientHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    })
    resizeObserver.observe(container)
  } else {
    window.addEventListener('resize', () => {
      sizes.width = window.innerWidth
      sizes.height = window.innerHeight
      camera.aspect = sizes.width / sizes.height
      camera.updateProjectionMatrix()
      renderer.setSize(sizes.width, sizes.height)
    })
  }

  /**
   * Visibility optimization
   */
  let isInView = true
  const observer = new IntersectionObserver((entries) => {
    isInView = entries[0].isIntersecting
  }, { threshold: 0.1 })
  observer.observe(container)

  /**
   * Animation loop
   */
  const clock = new THREE.Clock()
  let previousTime = 0
  let animationId

  const tick = () => {
    animationId = requestAnimationFrame(tick)
    if (!isInView || !modelLoaded) return

    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - previousTime
    previousTime = elapsedTime

    keyLight.position.x = Math.sin(elapsedTime * 0.4) * 4
    blueLight.position.y = Math.sin(elapsedTime * 0.8) * 2 + 1.5
    fillLight.position.z = Math.cos(elapsedTime * 0.5) * 3

    if (gear) gear.rotation.z += deltaTime * 0.1

    controls.update()
    renderer.render(scene, camera)
  }
  tick()

  /**
   * Cleanup
   */
  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(animationId)
    observer.disconnect()
    controls.dispose()
    renderer.dispose()
    scene.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose())
        } else {
          child.material.dispose()
        }
      }
    })
  })
}
