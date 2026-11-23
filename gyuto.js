// Cuchillo 3D procedural calcado del cuchillo de Togi (foto de referencia): hoja de ~175 mm con punta
// kiritsuke (lomo recto que cae en ángulo hasta la punta), filo casi plano, acabado moteado tipo nashiji,
// línea de laminado ondulada cerca del filo y mango octogonal de madera oscura. Gira siguiendo el cursor.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const box = document.getElementById('gyuto');
if (box) {
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Perfil de la hoja (1 unidad ≈ 50 mm; hoja de 175 mm, 48 mm de alto en el talón) ----------
  const L = 3.5, H = 0.97, CLIP = 2.75;                    // CLIP: donde el lomo empieza a caer (punta kiritsuke)
  const edgeY = x => 0.3 * Math.pow(x / L, 1.8);                                          // filo casi plano que sube suave
  const spineY = x => (x <= CLIP ? H : H - (x - CLIP) / (L - CLIP) * (H - edgeY(L)));     // lomo recto y corte recto a la punta
  const thick = (u, v) => Math.max(0.0015, 0.05 * (1 - 0.7 * u) * Math.pow(Math.min(1, v / 0.45), 0.75)); // cuña + adelgaza hacia la punta

  // Malla paramétrica: fn(a, b) -> [x, y, z], con UV = (a, b)
  const sheet = (fn, na, nb) => {
    const pos = [], uv = [], idx = [];
    for (let j = 0; j <= nb; j++) for (let i = 0; i <= na; i++) {
      const a = i / na, b = j / nb;
      pos.push(...fn(a, b)); uv.push(a, b);
    }
    for (let j = 0; j < nb; j++) for (let i = 0; i < na; i++) {
      const p = j * (na + 1) + i, q = p + na + 1;
      idx.push(p, p + 1, q, p + 1, q + 1, q);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  const side = s => (u, v) => {
    const x = u * L;
    return [x, edgeY(x) + (spineY(x) - edgeY(x)) * v, s * thick(u, v) / 2];
  };

  // ---------- Texturas pintadas en canvas ----------
  const tex = (w, h, draw, color = true) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    if (color) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  };
  // línea del laminado (v desde el filo): ondas irregulares como en la foto
  const hamon = x => 0.24 + 0.03 * Math.sin(x * 0.009) + 0.018 * Math.sin(x * 0.031 + 1.3) + 0.01 * Math.sin(x * 0.09 + 2.1);

  // Acero: el cuerpo con acabado kasumi (cepillado y opaco); bajo el hamon más claro, y el filo a espejo.
  const paintSteel = (base, low, edge, lines) => (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {                       // rayado del pulido a lo largo de la hoja
      g.strokeStyle = Math.random() < .5 ? `rgba(255,255,255,${lines})` : `rgba(0,0,0,${lines})`;
      const y = Math.random() * h, x = Math.random() * w;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40 + Math.random() * 260, y + (Math.random() - .5) * 2); g.stroke();
    }
    g.beginPath(); g.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) g.lineTo(x, h * (1 - hamon(x)));
    g.lineTo(w, h); g.closePath();
    g.filter = 'blur(2px)'; g.fillStyle = low; g.fill(); g.filter = 'none';
    g.fillStyle = edge; g.fillRect(0, h * 0.94, w, h * 0.06); // bisel del filo
  };
  // moteado tipo nashiji: grupos de puntos oscuros sobre la línea del laminado, con semilla fija
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const specks = (color, line) => (g, w, h) => {
    seed = 7;
    for (let c = 0; c < 70; c++) {
      const cx = rnd() * w, cy = h * (0.08 + rnd() * 0.5), sx = 40 + rnd() * 120, sy = 12 + rnd() * 40;
      for (let i = 0; i < 220; i++) {
        const x = cx + (rnd() + rnd() + rnd() - 1.5) * sx, y = cy + (rnd() + rnd() + rnd() - 1.5) * sy;
        if (y > h * (1 - hamon(x)) - 6) continue;
        g.fillStyle = color; g.beginPath(); g.arc(x, y, .5 + rnd() * 1.8, 0, 7); g.fill();
      }
    }
    g.strokeStyle = line; g.lineWidth = 2.5; g.beginPath();   // la línea fina y ondulada del laminado
    for (let x = 0; x <= w; x += 3) g.lineTo(x, h * (1 - hamon(x)) + Math.sin(x * .4) * .8);
    g.stroke();
  };
  const steelMap = tex(2048, 512, (g, w, h) => {
    paintSteel('#c3c6c8', '#e9ebec', '#f6f8f9', .04)(g, w, h);
    specks('rgba(70,72,76,.55)', 'rgba(90,92,96,.7)')(g, w, h);
    g.fillStyle = 'rgba(40,40,44,.55)';                    // marca grabada: 研 (togi)
    g.font = `${h * .2}px "Yu Mincho","MS Mincho","Hiragino Mincho ProN",serif`;
    g.fillText('研', w * 0.05, h * 0.42);
  });
  const roughMap = tex(2048, 512, (g, w, h) => {
    paintSteel('#5e5e5e', '#2c2c2c', '#121212', .08)(g, w, h);
    specks('#b0b0b0', '#808080')(g, w, h);                 // las motas son mate, el resto pulido
  }, false);

  const wood = tex(512, 1024, (g, w, h) => {
    g.fillStyle = '#2f2420'; g.fillRect(0, 0, w, h);       // madera oscura tipo ébano / wengué
    for (let i = 0; i < 260; i++) {                         // veta a lo largo del mango
      const x0 = Math.random() * w, a = 4 + Math.random() * 14, f = .002 + Math.random() * .006;
      g.strokeStyle = Math.random() < .5 ? `rgba(12,8,6,${.2 + Math.random() * .35})` : `rgba(110,85,70,${.08 + Math.random() * .14})`;
      g.lineWidth = .5 + Math.random() * 2.5;
      g.beginPath();
      for (let y = 0; y <= h; y += 8) g.lineTo(x0 + Math.sin(y * f + i) * a, y);
      g.stroke();
    }
  });

  // ---------- Modelo ----------
  const steel = new THREE.MeshPhysicalMaterial({ map: steelMap, roughnessMap: roughMap, metalness: 1, roughness: 1, side: THREE.DoubleSide, envMapIntensity: 1.25 });
  const knife = new THREE.Group();
  [sheet(side(1), 260, 40), sheet(side(-1), 260, 40),
   sheet((u, s) => { const x = u * L, t = thick(u, 1) / 2; return [x, spineY(x), -t + 2 * t * s]; }, 260, 2),            // lomo
   sheet((v, s) => { const y = edgeY(0) + (spineY(0) - edgeY(0)) * v, t = thick(0, v) / 2; return [0, y, -t + 2 * t * s]; }, 40, 2) // talón
  ].forEach(g => knife.add(new THREE.Mesh(g, steel)));

  const octo = (rTop, rBot, len, mat) => {                  // cilindro octogonal acostado sobre el eje X
    const g = new THREE.CylinderGeometry(rTop, rBot, len, 8, 1);
    g.rotateY(Math.PI / 8); g.rotateZ(Math.PI / 2);
    return new THREE.Mesh(g, mat);
  };
  // mango octogonal de una pieza (137 mm, ~24 mm de grueso), al ras del lomo; el talón baja ~25 mm por debajo
  const R = 0.25, HL = 2.75, HY = H - R * 0.92;
  const handle = octo(R * 0.94, R, HL, new THREE.MeshPhysicalMaterial({ map: wood, roughness: .5, clearcoat: .4, clearcoatRoughness: .35 }));
  handle.position.set(-HL / 2, HY, 0);
  knife.add(handle);

  knife.position.set(-(L - HL) / 2, -0.5, 0);              // centra el conjunto (de -2.75 a 3.5 en X)
  const pivot = new THREE.Group();
  pivot.add(knife);

  // ---------- Escena ----------
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  box.append(renderer.domElement);

  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.03).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 5, 4);
  scene.add(key, pivot);

  const camera = new THREE.PerspectiveCamera(28, 1, .1, 100);
  const fit = () => {
    const w = box.clientWidth, h = box.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0, Math.max(6.6 / (2 * t * camera.aspect), 3.4 / (2 * t)));
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(fit).observe(box);
  fit();

  // ---------- Movimiento con el cursor ----------
  const base = { x: 0.18, y: -0.45, z: 0.38 };             // en diagonal, la punta hacia arriba a la derecha
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  addEventListener('pointermove', e => {
    target.y = (e.clientX / innerWidth - .5) * 1.3;
    target.x = (e.clientY / innerHeight - .5) * 0.7;
  });

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(box);

  const frame = t => {
    if (!quieto) requestAnimationFrame(frame);
    if (!visible && !quieto) return;
    cur.x += (target.x - cur.x) * .06;
    cur.y += (target.y - cur.y) * .06;
    const f = quieto ? 0 : t / 1000;
    pivot.rotation.set(base.x + cur.x + Math.sin(f * .8) * .03, base.y + cur.y + Math.sin(f * .5) * .08, base.z);
    pivot.position.y = Math.sin(f * 1.1) * .06;            // flota suavemente
    renderer.render(scene, camera);
  };
  requestAnimationFrame(frame);
}
