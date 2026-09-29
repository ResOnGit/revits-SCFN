import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const VOID = 0x09090b
const WIRE = 0xe4e4e7
const WIRE_DIM = 0x71717a
const DOT = 0xffffff
const DOT_MID = 0xd4d4d8
const DOT_SOFT = 0xa1a1aa

const ROUTES = [
  {
    start: [14, 52],
    end: [-10, 124],
    color: DOT,
    size: 0.022,
    speed: 0.0009,
    phase: 0,
  },
  {
    start: [-28, -36],
    end: [22, 88],
    color: DOT_MID,
    size: 0.018,
    speed: 0.00115,
    phase: 0.28,
  },
  {
    start: [6, -108],
    end: [-20, 18],
    color: DOT_SOFT,
    size: 0.02,
    speed: 0.00072,
    phase: 0.58,
  },
]

function latLongToVector3(latitude, longitude, radius) {
  const phi = (90 - latitude) * (Math.PI / 180)
  const theta = (longitude + 180) * (Math.PI / 180)
  const x = -radius * Math.sin(phi) * Math.cos(theta)
  const y = radius * Math.cos(phi)
  const z = radius * Math.sin(phi) * Math.sin(theta)
  return new THREE.Vector3(x, y, z)
}

function pointOnArc(startNorm, endNorm, radius, t) {
  const quat = new THREE.Quaternion().setFromUnitVectors(startNorm, endNorm)
  const stepQuat = new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), quat, t)
  return startNorm.clone().applyQuaternion(stepQuat).multiplyScalar(radius)
}

function yoyo(t) {
  return t < 0.5 ? t * 2 : (1 - t) * 2
}

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

function createTraveler(route, globeGroup, disposables) {
  const startNorm = latLongToVector3(route.start[0], route.start[1], 1).normalize()
  const endNorm = latLongToVector3(route.end[0], route.end[1], 1).normalize()

  const dotGeometry = new THREE.SphereGeometry(route.size, 12, 12)
  const dotMaterial = new THREE.MeshBasicMaterial({ color: route.color })
  const mesh = new THREE.Mesh(dotGeometry, dotMaterial)
  globeGroup.add(mesh)
  disposables.push(dotGeometry, dotMaterial)

  const haloGeometry = new THREE.RingGeometry(route.size * 1.4, route.size * 1.95, 24)
  const haloMaterial = new THREE.MeshBasicMaterial({
    color: route.color,
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide,
  })
  const halo = new THREE.Mesh(haloGeometry, haloMaterial)
  mesh.add(halo)
  disposables.push(haloGeometry, haloMaterial)

  return {
    startNorm,
    endNorm,
    mesh,
    halo,
    speed: route.speed,
    pathT: route.phase,
  }
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

    const travelers = ROUTES.map((route) => createTraveler(route, globeGroup, disposables))

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
      if (!reducedMotion) {
        spin += 0.0016
        for (const traveler of travelers) {
          traveler.pathT += traveler.speed
          if (traveler.pathT > 1) traveler.pathT -= 1
        }
      }

      globeGroup.rotation.y = spin
      globeGroup.rotation.x = 0.42
      globeGroup.rotation.z = -0.12

      for (const traveler of travelers) {
        traveler.mesh.position.copy(pointOnArc(traveler.startNorm, traveler.endNorm, radius, yoyo(traveler.pathT)))
        traveler.halo.lookAt(camera.position)
      }

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
