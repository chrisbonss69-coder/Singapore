/* Original studio-lit robot bust for the scientific document-processing scene. */
function createWingRobot(canvas) {
  const T = THREE;
  const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;

  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-2.1, 2.1, 2.1, -2.1, .1, 30);
  camera.position.set(.13, 2.35, 7.6);
  camera.lookAt(0, 1.76, 0);

  const panorama = document.createElement('canvas');
  panorama.width = 512;
  panorama.height = 256;
  const lightPaint = panorama.getContext('2d');
  const sky = lightPaint.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, '#b2bdd7');
  sky.addColorStop(.29, '#575e72');
  sky.addColorStop(.55, '#232736');
  sky.addColorStop(1, '#404252');
  lightPaint.fillStyle = sky;
  lightPaint.fillRect(0, 0, 512, 256);
  for (const [x, y, width, height, tint] of [
    [14, 43, 69, 54, '#e7edf9'],
    [133, 42, 42, 110, '#f7fbff'],
    [258, 66, 63, 28, '#b7d8ff'],
    [362, 42, 26, 96, '#849eff'],
    [411, 35, 46, 22, '#b4b1cb'],
  ]) {
    lightPaint.fillStyle = tint;
    lightPaint.fillRect(x, y, width, height);
  }
  const panoramaTexture = new T.CanvasTexture(panorama);
  panoramaTexture.colorSpace = T.SRGBColorSpace;
  panoramaTexture.mapping = T.EquirectangularReflectionMapping;
  const reflections = new T.PMREMGenerator(renderer);
  scene.environment = reflections.fromEquirectangular(panoramaTexture).texture;
  panoramaTexture.dispose();
  reflections.dispose();

  scene.add(new T.HemisphereLight(0xc8d9fa, 0x464166, 1.40));

  function studioLight(position, color, intensity) {
    const light = new T.DirectionalLight(color, intensity);
    light.position.set(...position);
    scene.add(light);
  }

  studioLight([-3, 6, 5], 0xfff3e2, 3.05);
  studioLight([4, 2, 1.5], 0x80b8fa, 1.17);
  studioLight([1, 5, -4], 0x9094ff, 2.15);

  function metal(color, metalness, roughness, extra = {}) {
    return new T.MeshStandardMaterial({ color, metalness, roughness, ...extra });
  }

  const enamel = metal(0xb7c4cf, .43, .32);
  const ceramic = metal(0xe1e5e7, .26, .40);
  const alloy = metal(0x87909c, .86, .29);
  const chrome = metal(0xbec8d2, .94, .22);
  const chassis = metal(0x242b38, .77, .43);
  const graphite = metal(0x202733, .46, .51);
  const seals = metal(0x090c13, .09, .77);
  const visor = new T.MeshPhysicalMaterial({
    color: 0x0b1727,
    metalness: .53,
    roughness: .21,
    clearcoat: .81,
    clearcoatRoughness: .15,
    envMapIntensity: .69,
    side: T.DoubleSide,
  });
  const lens = new T.MeshPhysicalMaterial({
    color: 0x164672,
    metalness: .77,
    roughness: .15,
    clearcoat: 1,
    clearcoatRoughness: .09,
  });
  const bronze = metal(0xaa6f51, .81, .36);
  const lightBlue = metal(0x1d849d, .3, .35, { emissive: 0x3fc6ff, emissiveIntensity: 1.3 });
  const lightPale = metal(0x6ed4ed, .15, .31, { emissive: 0x90dfff, emissiveIntensity: 1.25 });
  const cable = metal(0x313a51, .30, .56);
  const pedestalAccent = metal(0x353d50, .83, .29);
  const unitBox = new T.BoxGeometry(1, 1, 1);
  const unitSphere = new T.SphereGeometry(1, 32, 24);

  function place(parent, geometry, material, x = 0, y = 0, z = 0) {
    const object = new T.Mesh(geometry, material);
    object.position.set(x, y, z);
    parent.add(object);
    return object;
  }

  function box(parent, material, x, y, z, width, height, depth) {
    const object = place(parent, unitBox, material, x, y, z);
    object.scale.set(width, height, depth);
    return object;
  }

  function dome(parent, material, x, y, z, radiusX, radiusY, radiusZ) {
    const object = place(parent, unitSphere, material, x, y, z);
    object.scale.set(radiusX, radiusY, radiusZ);
    return object;
  }

  function cylinder(parent, material, x, y, z, radius, length, axis = 'y', radiusBottom = radius) {
    const object = place(parent, new T.CylinderGeometry(radius, radiusBottom, length, 40), material, x, y, z);
    if (axis === 'z') object.rotation.x = Math.PI / 2;
    if (axis === 'x') object.rotation.z = Math.PI / 2;
    return object;
  }

  function ring(parent, material, radius, thickness, x, y, z, axis = 'z') {
    const object = place(parent, new T.TorusGeometry(radius, thickness, 10, 52), material, x, y, z);
    if (axis === 'y') object.rotation.x = Math.PI / 2;
    if (axis === 'x') object.rotation.y = Math.PI / 2;
    return object;
  }

  function pipe(parent, material, points, radius) {
    const path = new T.CatmullRomCurve3(points.map(point => new T.Vector3(...point)));
    return place(parent, new T.TubeGeometry(path, 36, radius, 8), material);
  }

  function link(parent, material, from, to, radius) {
    const line = new T.Vector3().fromArray(to).sub(new T.Vector3().fromArray(from));
    const mid = from.map((value, i) => (value + to[i]) * .5);
    const object = cylinder(parent, material, ...mid, radius, line.length());
    object.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), line.normalize());
    return object;
  }

  function panel(parent, material, points, z, depth, bevel = .027) {
    const shape = new T.Shape(points.map(point => new T.Vector2(...point)));
    const geometry = new T.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 4,
      steps: 1,
      curveSegments: 9,
    });
    return place(parent, geometry, material, 0, 0, z);
  }

  // Rounded, varying cross-sections keep the shell faceted where panels meet.
  function shell(parent, material, profile, roundness) {
    const radii = 64;
    const positions = [];
    const indices = [];
    for (const [y, width, depth, centerZ = 0] of profile) {
      for (let j = 0; j < radii; j++) {
        const angle = j / radii * Math.PI * 2;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const x = width * Math.sign(cosine) * Math.abs(cosine) ** roundness;
        const z = centerZ + depth * Math.sign(sine) * Math.abs(sine) ** roundness;
        positions.push(x, y, z);
      }
    }
    for (let row = 0; row < profile.length - 1; row++) {
      for (let j = 0; j < radii; j++) {
        const a = row * radii + j;
        const b = row * radii + (j + 1) % radii;
        indices.push(a, a + radii, b, b, a + radii, b + radii);
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return place(parent, geometry, material);
  }

  function bolt(parent, x, y, z, size = .018) {
    cylinder(parent, graphite, x, y, z, size * 1.17, .009, 'z');
    cylinder(parent, alloy, x, y, z + .005, size * .85, .010, 'z');
    const slot = box(parent, seals, x, y, z + .012, size * .93, .003, .003);
    slot.rotation.z = .52;
  }

  const model = new T.Group();
  scene.add(model);
  const core = new T.Group();
  model.add(core);

  cylinder(model, seals, 0, .060, 0, .88, .12, 'y', .81);
  cylinder(model, pedestalAccent, 0, .140, 0, .93, .079);
  cylinder(model, chassis, 0, .202, 0, .84, .068, 'y', .89);
  ring(model, alloy, .907, .011, 0, .164, 0, 'y');
  ring(model, lightBlue, .791, .009, 0, .240, 0, 'y');
  cylinder(core, graphite, 0, .295, 0, .68, .16, 'y', .74);
  ring(core, bronze, .705, .014, 0, .357, 0, 'y');

  shell(core, chassis, [
    [.30, .56, .34],
    [.38, .70, .43],
    [.58, .73, .45],
    [.87, .87, .46],
    [1.17, 1.02, .45],
    [1.38, 1.02, .41],
    [1.57, .92, .39],
    [1.72, .63, .31],
    [1.76, .30, .23],
    [1.77, .001, .001],
  ], .66);

  for (const side of [-1, 1]) {
    const group = new T.Group();
    group.position.x = side * .91;
    group.position.y = 1.20;
    core.add(group);

    cylinder(group, seals, side * .11, .13, -.08, .305, .31, 'x');
    cylinder(group, chrome, side * .33, .13, -.08, .275, .10, 'x');
    ring(group, chassis, .224, .018, side * .39, .13, -.08, 'x');
    cylinder(group, graphite, side * .405, .13, -.08, .193, .04, 'x');
    ring(group, alloy, .128, .013, side * .432, .13, -.08, 'x');
    cylinder(group, bronze, side * .447, .13, -.08, .079, .022, 'x');

    const armour = shell(group, ceramic, [
      [-.20, .003, .003, .06],
      [-.17, .11, .21, .06],
      [-.075, .23, .32, .04],
      [.15, .32, .38, .01],
      [.37, .31, .32, -.05],
      [.48, .23, .24, -.065],
      [.56, .11, .14, -.07],
      [.58, .003, .003, -.07],
    ], .65);
    armour.rotation.z = side * -.26;

    for (let stripe = 0; stripe < 4; stripe++) {
      const cut = box(group, graphite, side * .025, -.028 + stripe * .040, .345 + stripe * .006, .142, .012, .014);
      cut.rotation.z = side * -.22;
    }

    const chest = panel(core, enamel, [
      [.08, 1.50], [.43, 1.63], [.805, 1.44], [.89, 1.22], [.47, .87], [.16, .99],
    ].map(([x, y]) => [x * side, y]), .375, .084);
    chest.rotation.y = side * .04;

    panel(core, ceramic, [
      [.17, .943], [.44, .82], [.74, .945], [.56, .63], [.29, .51], [.16, .70],
    ].map(([x, y]) => [x * side, y]), .361, .064, .022);

    for (const [x, y] of [[.23, 1.42], [.685, 1.414], [.59, .788]]) {
      bolt(core, x * side, y, .502);
    }

    const window = panel(core, seals, [
      [.47, 1.14], [.733, 1.25], [.76, 1.205], [.51, 1.095],
    ].map(([x, y]) => [x * side, y]), .45, .026, .010);
    window.rotation.y = side * .038;
    for (let i = 0; i < 4; i++) {
      const slot = box(core, lightBlue, side * (.543 + i * .047), 1.141 + i * .019, .476, .034, .011, .012);
      slot.rotation.z = side * .37;
    }

    pipe(core, cable, [[side * .71, .63, .24], [side * .86, .41, .16], [side * .73, .28, .08]], .035);
    link(core, chrome, [side * .27, 1.63, .235], [side * .167, 1.94, .117], .025);
    link(core, chassis, [side * .305, 1.60, -.07], [side * .19, 2.02, -.108], .039);
    pipe(core, cable, [[side * .25, 1.55, -.235], [side * .28, 1.87, -.20], [side * .17, 2.10, -.158]], .028);
  }

  panel(core, graphite, [[-.24, 1.25], [.24, 1.25], [.17, .71], [-.17, .71]], .442, .054, .030);
  panel(core, seals, [[-.147, 1.137], [.147, 1.137], [.110, .861], [-.110, .861]], .497, .021, .018);
  for (let row = 0; row < 3; row++) {
    const y = 1.071 - row * .066;
    box(core, lightPale, -.073, y, .542, .025, .015, .008);
    box(core, lightBlue, .022, y, .542, .104 - row * .023, .011, .007);
  }
  panel(core, alloy, [[-.29, 1.69], [.29, 1.69], [.21, 1.41], [-.21, 1.41]], .365, .052, .040);
  panel(core, chassis, [[-.156, 1.645], [.156, 1.645], [.106, 1.47], [-.106, 1.47]], .454, .029, .013);
  cylinder(core, seals, 0, 1.784, 0, .217, .25, 'y', .28);
  cylinder(core, chrome, 0, 1.917, 0, .176, .28);
  for (let i = 0; i < 5; i++) {
    ring(core, i === 2 ? bronze : chassis, .182, .021, 0, 1.806 + i * .047, 0, 'y');
  }
  cylinder(core, chrome, 0, 2.059, 0, .23, .055, 'y', .18);

  const head = new T.Group();
  head.position.set(0, 2.62, .012);
  core.add(head);
  shell(head, enamel, [
    [-.555, .004, .004, .145],
    [-.522, .265, .255, .106],
    [-.470, .375, .356, .036],
    [-.345, .462, .421, -.034],
    [-.095, .543, .452, -.046],
    [.258, .545, .441, -.055],
    [.430, .499, .401, -.068],
    [.522, .421, .347, -.075],
    [.565, .273, .26, -.079],
    [.588, .004, .004, -.082],
  ], .66);

  // A curved, smoked sensor window wraps into the sides of the helmet.
  function facePane(material, centerOffset, extent = 1) {
    const positions = [];
    const cells = 38;
    for (const row of [0, 1, 2, 3, 4, 5, 6, 7]) {
      const v = row / 7;
      for (let col = 0; col <= cells; col++) {
        const horizontal = col / cells * 2 - 1;
        const a = horizontal * 1.20;
        const flange = Math.cos(horizontal * Math.PI / 2);
        const x = Math.sin(a) * (.542 + .026 * Math.sin(v * Math.PI));
        const z = .036 + .418 * Math.cos(a) + centerOffset + Math.sin(v * Math.PI) * .014;
        const y = (.087 + (v - .5) * (.372 + .061 * flange) * extent) + .049 * (1 - flange);
        positions.push(x, y, z);
      }
    }
    const indices = [];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < cells; col++) {
        const a = row * (cells + 1) + col;
        const b = a + cells + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    place(head, geometry, material);
  }

  facePane(graphite, .020, 1.11);
  facePane(visor, .037);

  function sensor(x, y, z, size, angle) {
    const mount = new T.Group();
    mount.position.set(x, y, z);
    mount.rotation.y = angle;
    head.add(mount);
    cylinder(mount, seals, 0, 0, 0, size * 1.20, .025, 'z');
    ring(mount, alloy, size, size * .10, 0, 0, .020);
    dome(mount, lens, 0, 0, .022, size * .84, size * .84, size * .24);
    ring(mount, lightBlue, size * .55, size * .036, 0, 0, .026);
    dome(mount, graphite, 0, 0, .045, size * .34, size * .34, size * .073);
    dome(mount, chrome, -.015, .02, .044, size * .105, size * .075, size * .05);
  }

  sensor(.123, .112, .486, .089, .16);
  sensor(-.148, .116, .480, .066, -.20);
  sensor(-.281, .126, .429, .036, -.41);

  for (let i = 0; i < 3; i++) {
    dome(head, lightPale, .247 + i * .031, .071 + i * .004, .449 - i * .015, .008, .008, .006);
  }

  pipe(head, lightBlue, [[-.465, .211, .309], [-.335, .178, .414], [-.22, .183, .468]], .007);
  pipe(head, lightBlue, [[.465, .211, .307], [.377, .181, .374], [.307, .173, .411]], .006);
  panel(head, graphite, [[-.28, -.230], [.28, -.230], [.20, -.355], [-.20, -.355]], .337, .047, .029);
  panel(head, chrome, [[-.117, -.245], [.117, -.245], [.092, -.319], [-.092, -.319]], .395, .015, .009);
  for (let i = 0; i < 5; i++) {
    box(head, seals, (i - 2) * .030, -.274, .419, .015, .009, .011);
  }
  for (const side of [-1, 1]) {
    bolt(head, side * .30, -.183, .395, .013);
    cylinder(head, graphite, side * .537, -.012, -.082, .177, .118, 'x');
    cylinder(head, alloy, side * .604, -.012, -.082, .140, .043, 'x');
    cylinder(head, seals, side * .632, -.012, -.082, .105, .041, 'x');
    ring(head, chrome, .080, .013, side * .658, -.012, -.082, 'x');
    ring(head, lightBlue, .060, .007, side * .666, -.012, -.082, 'x');
    cylinder(head, alloy, side * .665, -.012, -.082, .036, .019, 'x');
    pipe(head, graphite, [
      [side * .340, .444, .205], [side * .384, .403, .249],
      [side * .450, .311, .282], [side * .519, .239, .197],
    ], .0085);
  }

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = false;
  let paused = false;
  let request = 0;
  let last = 0;
  let elapsed = 0;
  let width = 0;
  let height = 0;
  const interval = 1000 / 30;

  function queue() {
    if (active && !request) request = requestAnimationFrame(draw);
  }

  function draw(now) {
    request = 0;
    const { clientWidth, clientHeight } = canvas;
    if (!active || !clientWidth || !clientHeight) return;
    const animate = !paused && !motion.matches;
    const needsResize = clientWidth !== width || clientHeight !== height;
    if (animate && !needsResize && last && now - last < interval - 2) {
      queue();
      return;
    }
    if (needsResize) {
      width = clientWidth;
      height = clientHeight;
      renderer.setSize(width, height, false);
      const aspect = width / height;
      camera.top = Math.max(1.85, 1.43 / aspect);
      camera.bottom = -camera.top;
      camera.right = camera.top * aspect;
      camera.left = -camera.right;
      camera.updateProjectionMatrix();
    }
    if (animate && last) elapsed += Math.min(.12, (now - last) / 1000);
    last = now;
    model.rotation.y = -.37 + .11 * Math.sin(elapsed * .54);
    head.rotation.y = .10 + .075 * Math.sin(elapsed * .81 + .75);
    head.rotation.x = -.045 + .033 * Math.sin(elapsed * .60);
    lightBlue.emissiveIntensity = 1.25 + .20 * Math.sin(elapsed * 1.7);
    renderer.render(scene, camera);
    if (animate) queue();
  }

  new ResizeObserver(queue).observe(canvas);
  motion.addEventListener('change', () => {
    last = 0;
    queue();
  });

  return {
    setActive(value) {
      if (active === value) return;
      active = value;
      last = 0;
      if (active) {
        elapsed = 0;
        queue();
      } else {
        cancelAnimationFrame(request);
        request = 0;
      }
    },
    setPaused(value) {
      paused = value;
      last = 0;
      queue();
    },
  };
}
