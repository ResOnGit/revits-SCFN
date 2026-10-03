import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const VOID = 0x09090b
const WIRE = 0xe4e4e7
const WIRE_DIM = 0x71717a

function wireframeSphere(radius, detail, color, opacity) {
  const geometry = new THREE.IcosahedronGeometry(radius, detail)
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  })
  const mesh = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), material)
  geometry.dispose()
  return { mesh, material }
}

export default function LoginGlobe() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const lookTarget = new THREE.Vector3()

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(VOID)

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100)

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const globeGroup = new THREE.Group()
    globeGroup.rotation.order = 'YXZ'
    scene.add(globeGroup)

    const radius = 1
    const disposables = []

    const outer = wireframeSphere(radius, 5, WIRE, 0.72)
    globeGroup.add(outer.mesh)
    disposables.push(outer.material, outer.mesh.geometry)

    const inner = wireframeSphere(radius * 0.992, 3, WIRE_DIM, 0.28)
    globeGroup.add(inner.mesh)
    disposables.push(inner.material, inner.mesh.geometry)

    function layout() {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (w === 0 || h === 0) return

      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h, false)

      const compact = w < 720
      const sizeBase = Math.min(w, h)
      const scale = (compact ? 3.4 : 4.6) * (sizeBase / 900)

      const anchorX = compact ? 1.55 : 2.35
      const anchorY = compact ? -1.35 : -2.05

      globeGroup.scale.setScalar(scale)
      globeGroup.position.set(anchorX, anchorY, 0)

      lookTarget.set(anchorX * 0.82, anchorY * 0.78, 0)
      camera.position.set(compact ? -0.15 : -0.55, compact ? 0.55 : 0.95, compact ? 2.35 : 1.95)
      camera.lookAt(lookTarget)
    }

    layout()
    window.addEventListener('resize', layout)

    const resizeObserver = new ResizeObserver(() => layout())
    resizeObserver.observe(mount)

    let spin = 0.45
    let raf = 0

    function tick() {
      if (!reducedMotion) spin += 0.0016

      globeGroup.rotation.y = spin
      globeGroup.rotation.x = 0.42
      globeGroup.rotation.z = -0.12

      renderer.render(scene, camera)
      if (!reducedMotion) raf = requestAnimationFrame(tick)
    }

    tick()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', layout)
      resizeObserver.disconnect()
      disposables.forEach((item) => item.dispose())
      renderer.dispose()
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [])

  return <div className="login-globe" ref={mountRef} aria-hidden="true" />
}
