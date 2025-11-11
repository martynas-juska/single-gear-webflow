import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

if (!window.__gear3DInitialized) {
  window.__gear3DInitialized = true

  const canvas = document.getElementById('webgl-canvas') || document.querySelector('canvas.webgl')
  const container = canvas?.parentElement || document.body

  if (!canvas) {
    console.error('❌ Canvas element with id="webgl-canvas" not found.')
  } else {
    // Ensure canvas uses the container space
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'

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

    // === Sizes ===
    const sizes = {
      width: container.clientWidth || window.innerWidth,
      height: container.clientHeight || window.innerHeight
    }

    // === Camera ===
    const camera = new THREE.PerspectiveCamera(45, sizes.width / sizes.height, 0.01, 100)
    scene.add(camera)

    // === Controls (rotate only) ===
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.enableZoom = false
    controls.enablePan = false
    controls.target.set(0, 0, 0)

    // === Renderer ===
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    })
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputEncoding = THREE.sRGBEncoding

    // === Model ===
    const loader = new GLTFLoader()
    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    const CDN = 'https://single-gear-webflow.vercel.app'
    const modelPath = isLocal ? './models/gear/Gear13.gltf' : `${CDN}/models/gear/Gear13.gltf`

    let gear = null
    let fitSphereRadius = 1 // keep for responsive refit

    // Helper: fit camera to object inside container
    function fitCameraToObject(radius, margin = 1.5) {
      // increased margin from 1.12 → 1.5 so it’s not zoomed in too close
      const fov = THREE.MathUtils.degToRad(camera.fov)
      const dist = (radius * margin) / Math.tan(fov / 2)
      camera.position.set(0, 0.15, dist) // lifted slightly upward (0.15)
      camera.near = dist / 100
      camera.far = dist * 10
      camera.updateProjectionMatrix()
      controls.update()
    }

    loader.load(
      modelPath,
      (gltf) => {
        gear = gltf.scene

        // Material + prep
        gear.traverse((c) => {
          if (c.isMesh) {
            c.material = new THREE.MeshPhysicalMaterial({
              color: 0xb0b0b0,
              metalness: 1,
              roughness: 0.35,
              clearcoat: 0.9,
              clearcoatRoughness: 0.15
            })
          }
        })

        // Center model at origin
        const box = new THREE.Box3().setFromObject(gear)
        const center = new THREE.Vector3()
        box.getCenter(center)
        gear.position.sub(center)

        // Stand upright (face camera)
        gear.rotation.x = -Math.PI / 2

        scene.add(gear)

        // Compute bounding sphere AFTER centering/orientation
        const sphere = new THREE.Sphere()
        new THREE.Box3().setFromObject(gear).getBoundingSphere(sphere)
        fitSphereRadius = sphere.radius

        // Fit camera to object
        fitCameraToObject(fitSphereRadius, 1.5)

        // Fire Webflow event
        window.dispatchEvent(new CustomEvent('webglReady'))
      },
      undefined,
      (err) => console.error('❌ Model load error:', err)
    )

    // === Resize handling ===
    function onResize() {
      const width = container.clientWidth || window.innerWidth
      const height = container.clientHeight || window.innerHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)

      // Refitting keeps div ratio correct
      if (gear) fitCameraToObject(fitSphereRadius, 1.5)
    }
    window.addEventListener('resize', onResize)

    // === Animation loop ===
    const clock = new THREE.Clock()
    function tick() {
      const t = clock.getElapsedTime()
      if (gear) {
        // spin around vertical axis (upright gear)
        gear.rotation.z = t * 0.4
      }
      controls.update()
      renderer.render(scene, camera)
      requestAnimationFrame(tick)
    }
    tick()
  }
}
