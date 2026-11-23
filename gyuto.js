// Gyuto 3D procedural: hoja con biselado real (sección en cuña), acabado kasumi + hamon,
// filo pulido a espejo, virola octogonal de cuerno y mango wa de madera. Gira siguiendo el cursor.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const box = document.getElementById('gyuto');
if (box) {
  const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Perfil de la hoja (1 unidad ≈ 50 mm; hoja de 210 mm) ----------
  const L = 4.2, H = 0.95, TIP = 0.6;
  const edgeY = x => (x <= 2 ? 0 : Math.pow((x - 2) / (L - 2), 2.2) * TIP);              // filo: plano y luego "barriga"
  const spineY = x => (x <= 2.6 ? H : H - Math.pow((x - 2.6) / (L - 2.6), 2.4) * (H - TIP)); // lomo: recto y baja a la punta
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
  const hamon = x => 0.27 + 0.035 * Math.sin(x * 0.011) + 0.02 * Math.sin(x * 0.037 + 1.3); // línea ondulada del templado (v)

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
    g.filter = 'blur(6px)'; g.fillStyle = low; g.fill(); g.filter = 'none';
    g.fillStyle = edge; g.fillRect(0, h * 0.93, w, h * 0.07); // bisel del filo
  };
  const steelMap = tex(2048, 512, (g, w, h) => {
    paintSteel('#b4b8bb', '#e4e7e9', '#f6f8f9', .05)(g, w, h);
    g.fillStyle = 'rgba(40,40,44,.55)';                    // marca grabada: 研 (togi)
    g.font = `${h * .2}px "Yu Mincho","MS Mincho","Hiragino Mincho ProN",serif`;
    g.fillText('研', w * 0.05, h * 0.42);
  });
  const roughMap = tex(2048, 512, paintSteel('#6e6e6e', '#3a3a3a', '#121212', .08), false);

  const wood = tex(512, 1024, (g, w, h) => {
    g.fillStyle = '#5b3b27'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) {                         // veta a lo largo del mango
      const x0 = Math.random() * w, a = 4 + Math.random() * 14, f = .002 + Math.random() * .006;
      g.strokeStyle = Math.random() < .5 ? `rgba(30,16,8,${.15 + Math.random() * .3})` : `rgba(150,100,60,${.08 + Math.random() * .15})`;
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
  const HY = 0.76;                                         // altura del eje del mango
  const horn = octo(0.152, 0.148, 0.28, new THREE.MeshPhysicalMaterial({ color: 0x1b1918, roughness: .35, clearcoat: .8, clearcoatRoughness: .2 }));
  horn.position.set(-0.14, HY, 0);
  const handle = octo(0.13, 0.15, 1.55, new THREE.MeshPhysicalMaterial({ map: wood, roughness: .55, clearcoat: .35, clearcoatRoughness: .4 }));
  handle.position.set(-0.28 - 0.775, HY, 0);
  knife.add(horn, handle);

  knife.position.set(-(L - 1.83) / 2, -0.55, 0);           // centra el conjunto (de -1.83 a 4.2 en X)
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
    camera.position.set(0, 0, Math.max(6.4 / (2 * t * camera.aspect), 3.4 / (2 * t)));
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
