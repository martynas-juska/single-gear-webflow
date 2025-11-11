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
    const scene = new THREE.Scene()

    // === Lights ===
    const ambient = new THREE.AmbientLight(0x557799, 0.6)
    scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0xffffff, 2)
    keyLight.position.set(4, 4, 2)
    scene.add(keyLight)

    const blueLight = new THREE.PointLight(0x5ac8fa, 3, 10)
    blueLight.position.set(-3, 1.5, -2)
    scene.add(blueLight)

    const fillLight = new THREE.PointLight(0x99ccff, 1.0, 8)
    fillLight.position.set(0, -1, 3)
    scene.add(fillLight)

    // === Model Loader ===
    const loader = new GLTFLoader()
    let gear = null

    const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    const CDN = 'https://single-gear-webflow.vercel.app'
    const modelPath = isLocal
      ? './models/gear/Gear13.gltf'
      : `${CDN}/models/gear/Gear13.gltf`

    loader.load(
      modelPath,
      (gltf) => {
        gear = gltf.scene
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

        gear.rotation.x = Math.PI * 0.5
        // ⚖️ Middle ground scale
        gear.scale.set(0.75, 0.75, 0.75)
        scene.add(gear)

        window.dispatchEvent(new CustomEvent('webglReady'))
      },
      undefined,
      (err) => console.error('❌ Model load error:', err)
    )

    // === Camera ===
    const sizes = {
      width: container.clientWidth || window.innerWidth,
      height: container.clientHeight || window.innerHeight
    }

    const camera = new THREE.PerspectiveCamera(60, sizes.width / sizes.height, 0.1, 100)

    // ⚙️ Balanced camera distance
    if (isLocal) {
      camera.position.set(3.2, 3.2, 3.2)
    } else {
      camera.position.set(1.9, 1.9, 1.9)
    }
    scene.add(camera)

    // === Controls ===
    const controls = new OrbitControls(camera, canvas)
    controls.enableDamping = true
    controls.enableZoom = false
    controls.rotateSpeed = 0.6
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

    // === Resize ===
    const resize = () => {
      const width = container.clientWidth || window.innerWidth
      const height = container.clientHeight || window.innerHeight
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height)
    }
    window.addEventListener('resize', resize)

    // === Animation ===
    const clock = new THREE.Clock()
    const animate = () => {
      const elapsed = clock.getElapsedTime()
      if (gear) gear.rotation.z = elapsed * 0.15

      controls.update()
      renderer.render(scene, camera)
      requestAnimationFrame(animate)
    }
    animate()
  }
}
