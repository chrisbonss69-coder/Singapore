/* A rotating miniature of a neighbourhood supplied by wind and roof solar panels. */
function createEnvironmentExhibit(canvas) {
  const T = THREE;
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;

  const scene = new T.Scene();
  const camera = new T.OrthographicCamera(-4, 4, 2.65, -2.65, .1, 30);
  camera.position.set(2.7, 4.25, 7.3);
  camera.lookAt(0, .96, 0);
  scene.add(new T.HemisphereLight(0xfff3db, 0x7379ae, 2.15));
  const key = new T.DirectionalLight(0xffe6c6, 3.05);
  key.position.set(-4, 7, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -3.4, right: 3.4, top: 3.4, bottom: -3.4, near: .1, far: 16 });
  key.shadow.normalBias = .04;
  key.shadow.bias = -.0004;
  scene.add(key);
  const rim = new T.DirectionalLight(0x7e90ff, 1.45);
  rim.position.set(4, 4, -5);
  scene.add(rim);

  const model = new T.Group();
  scene.add(model);
  const material = (color, extra = {}) => new T.MeshStandardMaterial({ color, roughness: .74, ...extra });
  const stone = material(0xd9a485);
  const base = material(0x3b4b60, { roughness: .45, metalness: .25 });
  const rimMetal = material(0xb8a998, { roughness: .27, metalness: .47 });
  const lawn = material(0x446f36, { roughness: 1 });
  const paving = material(0xc4c2a1);
  const plaster = material(0xdedbd1);
  const trim = material(0x86908c);
  const terracotta = material(0xb96346);
  const glazing = material(0x2e607f, { roughness: .28, metalness: .18 });
  const panelFrame = material(0x566b8c, { roughness: .32, metalness: .42 });
  const cells = [0x123465, 0x194074, 0x1e4678].map(color => material(color, { roughness: .32, metalness: .25 }));
  const rotorPaint = material(0xe7ecdf, { roughness: .46 });
  const bark = material(0x6d5540);
  const cubeGeometry = new T.BoxGeometry(1, 1, 1);

  function shape(geometry, paint, parent, x, y, z, castsShadow = false) {
    const object = new T.Mesh(geometry, paint);
    object.position.set(x, y, z);
    object.castShadow = castsShadow;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  function box(parent, paint, x, y, z, width, height, depth, castsShadow = false) {
    const object = shape(cubeGeometry, paint, parent, x, y, z, castsShadow);
    object.scale.set(width, height, depth);
    return object;
  }

  function cylinder(parent, paint, x, y, z, top, bottom, height, sides, castsShadow = false) {
    return shape(new T.CylinderGeometry(top, bottom, height, sides), paint, parent, x, y, z, castsShadow);
  }

  function ring(radius, thickness, height, paint) {
    const edge = shape(new T.TorusGeometry(radius, thickness, 8, 96), paint, model, 0, height, 0);
    edge.rotation.x = -Math.PI / 2;
  }

  const profile = [[0, -.72], [1.57, -.72], [1.76, -.69], [1.97, -.58], [2.11, -.42], [2.19, -.22], [2.2, -.08], [0, -.08]];
  shape(new T.LatheGeometry(profile.map(([radius, height]) => new T.Vector2(radius, height)), 96), stone, model, 0, 0, 0);
  cylinder(model, base, 0, -.74, 0, 1.6, 1.57, .10, 96);
  ring(1.65, .014, -.704, rimMetal);
  cylinder(model, lawn, 0, -.025, 0, 2.19, 2.2, .13, 96);
  ring(2.192, .018, -.06, rimMetal);

  let seed = 243;
  function random() {
    seed = Math.imul(1664525, seed) + 1013904223 >>> 0;
    return seed / 4294967296;
  }

  const grass = document.createElement('canvas');
  grass.width = grass.height = 480;
  const brush = grass.getContext('2d');
  brush.fillStyle = '#699357';
  brush.fillRect(0, 0, 480, 480);
  for (let i = 0; i < 17900; i++) {
    const hue = 78 + random() * 33;
    const light = 20 + random() * 45;
    brush.fillStyle = 'hsla(' + hue + ', 37%, ' + light + '%, .53)';
    brush.fillRect(random() * 480, random() * 480, .7 + random() * 2.8, .7 + random() * 2.8);
  }
  const texture = new T.CanvasTexture(grass);
  texture.colorSpace = T.SRGBColorSpace;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const turf = shape(
    new T.CircleGeometry(2.19, 96), material(0xc5d9ba, { map: texture, roughness: 1 }),
    model, 0, .043, 0,
  );
  turf.rotation.x = -Math.PI / 2;

  function path(points, width) {
    const curve = new T.CatmullRomCurve3(points.map(([x, z]) => new T.Vector3(x, .05, z)));
    const ribbon = new T.BufferGeometry();
    const vertices = [];
    const triangles = [];
    for (let i = 0; i <= 24; i++) {
      const point = curve.getPoint(i / 24);
      const tangent = curve.getTangent(i / 24);
      for (const side of [-1, 1]) {
        vertices.push(point.x + side * tangent.z * width / 2, point.y, point.z - side * tangent.x * width / 2);
      }
      if (i) triangles.push(i * 2 - 2, i * 2, i * 2 - 1, i * 2 - 1, i * 2, i * 2 + 1);
    }
    ribbon.setIndex(triangles);
    ribbon.setAttribute('position', new T.Float32BufferAttribute(vertices, 3));
    ribbon.computeVertexNormals();
    shape(ribbon, paving, model, 0, 0, 0);
  }

  path([[-.55, 1.86], [-.33, 1.21], [-.63, .66], [-.43, -.1], [.11, -.18], [.85, .40], [1.41, .68]], .15);
  path([[-.62, .66], [-1.17, .44], [-1.61, .39]], .105);

  const windowTransforms = [];
  function building(x, z, width, depth, height, floors, cap) {
    box(model, paving, x, .075, z, width + .14, .06, depth + .14);
    box(model, plaster, x, height / 2 + .103, z, width, height, depth, true);
    box(model, cap, x, height + .126, z, width + .036, .065, depth + .04, true);
    box(model, trim, x, height + .179, z - .13, width * .42, .05, depth * .24, true);
    const storey = (height - .19) / floors;

    function windowAt(px, py, pz, w, h, d) {
      windowTransforms.push(new T.Matrix4().compose(
        new T.Vector3(px, py, pz), new T.Quaternion(), new T.Vector3(w, h, d),
      ));
    }

    for (let floor = 0; floor < floors; floor++) {
      const y = .19 + storey * (floor + .43);
      for (const side of [-1, 1]) {
        for (const column of [-1, 0, 1]) {
          windowAt(x + column * width * .254, y, z + side * depth * .502, width * .156, storey * .43, .012);
        }
        for (const column of [-1, 1]) {
          windowAt(x + side * width * .502, y, z + column * depth * .205, .012, storey * .43, depth * .25);
        }
      }
    }

    box(model, trim, x, .199, z + depth / 2 + .008, width * .22, .19, .016);
    box(model, cap, x, .304, z + depth / 2 + .045, width * .38, .034, .10);
  }

  building(.26, -.82, .91, .78, 2.03, 6, terracotta);
  building(1.05, -.18, .65, .68, 1.37, 4, trim);
  building(-.005, .51, .68, .62, .89, 3, trim);

  const windows = new T.InstancedMesh(cubeGeometry, glazing, windowTransforms.length);
  windowTransforms.forEach((transform, i) => windows.setMatrixAt(i, transform));
  model.add(windows);

  function solar(x, y, z, width, depth, angle) {
    const array = new T.Group();
    array.position.set(x, y, z);
    array.rotation.x = .47;
    array.rotation.y = angle;
    model.add(array);
    box(array, panelFrame, 0, 0, 0, width, .043, depth, true);
    const cellWidth = (width - .044) / 3;
    const cellDepth = (depth - .044) / 4;
    for (let row = 0; row < 4; row++) {
      for (let i = 0; i < 3; i++) {
        box(array, cells[(row + i * 2) % 3], (i - 1) * cellWidth, .023, (row - 1.5) * cellDepth, cellWidth - .010, .006, cellDepth - .009);
      }
    }
  }

  solar(.985, 1.635, -.10, .68, .52, -.11);
  solar(-.03, 1.126, .55, .60, .44, .13);
  for (const x of [.78, 1.37]) {
    box(model, paving, x, .067, 1.08, .50, .04, .55);
    box(model, panelFrame, x, .161, 1.06, .038, .22, .04);
    solar(x, .285, 1.04, .52, .44, 0);
  }

  const bladeOutline = new T.Shape();
  bladeOutline.moveTo(-.025, .031);
  bladeOutline.bezierCurveTo(-.091, .23, -.054, .55, .025, .68);
  bladeOutline.bezierCurveTo(.043, .57, .068, .34, .06, .18);
  bladeOutline.lineTo(.025, .031);
  bladeOutline.closePath();
  const bladeGeometry = new T.ExtrudeGeometry(bladeOutline, {
    depth: .012, bevelEnabled: true, bevelSize: .006, bevelThickness: .008, bevelSegments: 2, curveSegments: 10,
  });
  const hubGeometry = new T.SphereGeometry(.071, 14, 10);
  const rotors = [];
  function turbine(x, z, height, span, yaw, phase, speed) {
    const stand = new T.Group();
    stand.position.set(x, .075, z);
    stand.rotation.y = yaw;
    model.add(stand);
    cylinder(stand, paving, 0, -.01, 0, .14, .15, .055, 24);
    cylinder(stand, rotorPaint, 0, height / 2, 0, .031, .068, height, 20, true);
    const nacelle = box(stand, rotorPaint, 0, height, .008, .115, .104, .23, true);
    nacelle.rotation.x = -.04;
    const rotor = new T.Group();
    rotor.position.set(0, height + .003, .138);
    rotor.scale.setScalar(span);
    stand.add(rotor);
    shape(hubGeometry, rotorPaint, rotor, 0, 0, .026, true).scale.set(1, 1, .67);
    for (let blade = 0; blade < 3; blade++) {
      const propeller = shape(bladeGeometry, rotorPaint, rotor, 0, 0, 0, true);
      propeller.rotation.z = blade * Math.PI * 2 / 3;
    }
    rotors.push({ rotor, phase, speed });
  }

  turbine(-1.49, .06, 1.87, 1.04, .22, .38, 1.9);
  turbine(-.94, -1.03, 2.17, .93, .32, 1.17, 1.52);

  const leaves = [0x80af54, 0x578943, 0x79a55f, 0x9bbe6c].map(color => material(color));
  const crown = new T.IcosahedronGeometry(1, 1);
  const fir = new T.ConeGeometry(1, 1, 8);
  const treeLocations = [
    [-1.44, .78, .52], [-1.15, 1.27, .35], [-.77, 1.43, .48], [-.03, 1.72, .34],
    [1.54, .64, .46], [1.72, .11, .34], [1.38, -.93, .50], [.65, -1.56, .38],
    [-.32, -1.68, .40], [-1.47, -.75, .38], [-1.8, -.22, .29],
  ];
  treeLocations.forEach(([x, z, scale], i) => {
    cylinder(model, bark, x, .045 + scale * .19, z, scale * .055, scale * .075, scale * .38, 7);
    if (i % 3 === 0) {
      for (let tier = 0; tier < 3; tier++) {
        const branch = shape(fir, leaves[(i + tier) % leaves.length], model, x, .15 + scale * (.37 + tier * .19), z, true);
        const radius = scale * (.46 - tier * .10);
        branch.scale.set(radius, scale * .48, radius);
      }
    } else {
      const top = shape(crown, leaves[i % leaves.length], model, x, .05 + scale * .70, z, true);
      top.scale.set(scale * .40, scale * .48, scale * .41);
      top.rotation.y = random() * Math.PI;
    }
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = false;
  let paused = false;
  let frame = 0;
  let last = 0;
  let elapsed = 0;
  let renderWidth = 0;
  let renderHeight = 0;

  function queue() {
    if (active && !frame) frame = requestAnimationFrame(draw);
  }

  function draw(now) {
    frame = 0;
    const { clientWidth, clientHeight } = canvas;
    if (!active || !clientWidth || !clientHeight) return;
    if (clientWidth !== renderWidth || clientHeight !== renderHeight) {
      renderWidth = clientWidth;
      renderHeight = clientHeight;
      renderer.setSize(clientWidth, clientHeight, false);
      const aspect = clientWidth / clientHeight;
      camera.top = Math.max(2.65, 2.55 / aspect);
      camera.bottom = -camera.top;
      camera.right = camera.top * aspect;
      camera.left = -camera.right;
      camera.updateProjectionMatrix();
    }
    if (!paused && !reducedMotion && last) elapsed += Math.min((now - last) / 1000, .08);
    last = now;
    model.rotation.y = -.20 + elapsed * .265;
    for (const { rotor, phase, speed } of rotors) rotor.rotation.z = phase + elapsed * speed;
    renderer.render(scene, camera);
    if (!paused && !reducedMotion) queue();
  }

  new ResizeObserver(queue).observe(canvas);
  return {
    setActive(value) {
      if (value === active) return;
      active = value;
      last = 0;
      if (active) {
        elapsed = 0;
        queue();
      } else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
    setPaused(value) {
      paused = value;
      last = 0;
      queue();
    },
  };
}
