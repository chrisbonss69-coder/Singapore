/* A bound book with double-sided sheets and worked matrix examples. */
function createMatrixBook(canvas) {
  const T = THREE;
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(38, 16 / 9, .1, 35);
  scene.add(new T.HemisphereLight(0xf3f2dc, 0x385657, 1.65));
  const sun = new T.DirectionalLight(0xffe8bd, 2.5);
  sun.position.set(-3, 6, 4);
  scene.add(sun);
  const rim = new T.DirectionalLight(0xa9dee5, 1.2);
  rim.position.set(5, 1, -5);
  scene.add(rim);

  const book = new T.Group();
  book.rotation.y = -.12;
  scene.add(book);
  const width = 2.18;
  const height = 3.12;
  const binding = .025;
  const turnDuration = .94;
  const spreadDuration = 2.73;

  function solid(w, h, d, colour, x, y) {
    const material = new T.MeshStandardMaterial({ color: colour, roughness: .74 });
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, 0);
    book.add(mesh);
  }

  solid(4.68, .17, 3.39, 0x23345d, 0, -.23);
  solid(.10, .11, height + .15, 0x293655, 0, -.085);
  for (const side of [-1, 1]) {
    solid(width, .14, height, 0xd4bc93, side * (width / 2 + .04), -.095);
    for (let i = 0; i < 5; i++) {
      solid(width + .008, .011, height + .008, 0xebdabb, side * (width / 2 + .04), -.147 + i * .026);
    }
  }

  const a = [1, 2, 0, 1];
  const b = [2, 0, 1, 1];
  const pages = [
    { title: 'Add matrices', sign: '+', first: a, second: b, result: [3, 2, 1, 2], example: '1 + 2 = 3' },
    { title: 'Subtract matrices', sign: '−', first: a, second: b, result: [-1, 2, -1, 0], example: '1 − 2 = −1' },
    { title: 'Double a matrix', sign: '×', factor: '2', second: a, result: [2, 4, 0, 2], example: '2 × 2 = 4' },
    { title: 'Transpose a matrix', first: a, superscript: 'T', result: [1, 0, 2, 1], example: 'Row (1, 2) → column (1, 2)' },
    { title: 'Multiply A by B', sign: '×', first: a, second: b, result: [4, 2, 1, 1], example: '1 × 2 + 2 × 1 = 4' },
    { title: 'Multiply B by A', sign: '×', first: b, second: a, result: [2, 4, 1, 3], example: '2 × 2 + 0 × 1 = 4' },
  ];

  function printedPage(page, index) {
    const paper = document.createElement('canvas');
    paper.width = 760;
    paper.height = 1080;
    const ink = paper.getContext('2d');
    const right = index % 2 === 1;
    const shade = ink.createLinearGradient(0, 0, 760, 0);
    shade.addColorStop(0, right ? '#d7c9b1' : '#f8edd9');
    shade.addColorStop(.13, '#f8eddd');
    shade.addColorStop(.87, '#f8eddd');
    shade.addColorStop(1, right ? '#f8edd9' : '#d7c9b1');
    ink.fillStyle = shade;
    ink.fillRect(0, 0, 760, 1080);
    ink.textAlign = 'center';

    function text(message, x, y, size, colour = '#1c3049', font = 'Georgia') {
      ink.fillStyle = colour;
      ink.font = size + 'px ' + font;
      ink.fillText(message, x, y);
    }

    function matrix(x, y, entries) {
      const bracketWidth = 198;
      ink.strokeStyle = '#283a54';
      ink.lineWidth = 5;
      for (const direction of [1, -1]) {
        const edge = direction === 1 ? x : x + bracketWidth;
        ink.beginPath();
        ink.moveTo(edge + direction * 17, y);
        ink.lineTo(edge, y);
        ink.lineTo(edge, y + 161);
        ink.lineTo(edge + direction * 17, y + 161);
        ink.stroke();
      }
      entries.forEach((value, index) => {
        const number = String(value).replace('-', '−');
        text(number, x + 51 + index % 2 * 96, y + 65 + Math.floor(index / 2) * 74, 71);
      });
    }

    text('LINEAR ALGEBRA', 380, 116, 31, '#3b537b', 'Arial');
    ink.fillStyle = '#8191a4';
    ink.fillRect(83, 139, 594, 2);
    text(page.title, 380, 248, 66);

    if (page.second) {
      if (page.factor) text(page.factor, 199, 432, 83);
      else matrix(100, 329, page.first);
      text(page.sign, 380, 435, 76);
      matrix(462, 329, page.second);
    } else {
      matrix(281, 329, page.first);
      text(page.superscript, 511, 351, 51);
    }
    text('=', 380, 584, 72);
    matrix(281, 630, page.result);
    text(page.example, 380, 906, 49, '#314c77');
    text(String(24 + index), 380, 1010, 32, '#4a6284', 'Arial');
    const texture = new T.CanvasTexture(paper);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  const textures = pages.map(printedPage);
  const reverseTextures = textures.map((texture) => {
    const reverse = texture.clone();
    reverse.repeat.x = -1;
    reverse.offset.x = 1;
    reverse.needsUpdate = true;
    return reverse;
  });

  function paperGeometry() {
    const geometry = new T.PlaneGeometry(width, height, 30, 14);
    const positions = geometry.getAttribute('position');
    const originalPositions = positions.array.slice();
    positions.setUsage(T.DynamicDrawUsage);
    return { geometry, positions, originalPositions };
  }

  function shapePaper(paper, side, progress = 0) {
    const { geometry, positions, originalPositions } = paper;
    const ease = progress * progress * (3 - 2 * progress);
    const bend = Math.sin(progress * Math.PI);
    const curlAmplitude = bend * Math.min(1, 4 * ease, 4 * (1 - ease));
    for (let i = 0; i < positions.count; i++) {
      const x = originalPositions[i * 3];
      const z = -originalPositions[i * 3 + 1];
      const u = .5 + side * x / width;
      const distance = u * width + binding;
      const heightOnStack = .14 * Math.sin(Math.PI * u) + .075 * u;
      const curl = curlAmplitude * ((u - .44) * .65 - z * .10);
      const angle = Math.PI * ease + curl;
      positions.setXYZ(
        i,
        side * distance * Math.cos(angle),
        heightOnStack + distance * Math.sin(angle),
        z + bend * u * .08,
      );
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();
  }

  function sheet(geometry, side) {
    const material = new T.MeshStandardMaterial({ roughness: .86, map: textures[0], side });
    const mesh = new T.Mesh(geometry, material);
    book.add(mesh);
    return mesh;
  }

  const left = paperGeometry();
  const right = paperGeometry();
  shapePaper(left, -1);
  shapePaper(right, 1);
  // Left and right share the same front-facing normal.
  const leftSheet = sheet(left.geometry, T.FrontSide);
  const rightSheet = sheet(right.geometry, T.FrontSide);
  const turning = paperGeometry();
  const front = sheet(turning.geometry, T.FrontSide);
  const back = sheet(turning.geometry, T.BackSide);
  for (const face of [front, back]) {
    face.position.y = .013;
    face.frustumCulled = false;
  }

  function trackPages(elapsed) {
    const spread = Math.min(pages.length / 2 - 1, Math.floor(elapsed / spreadDuration));
    const available = spread * 2 + 2 < pages.length;
    const timeInSpread = elapsed - spread * spreadDuration;
    const progress = available ? Math.max(0, (timeInSpread - (spreadDuration - turnDuration)) / turnDuration) : 0;
    const page = spread * 2;
    leftSheet.material.map = textures[page];
    rightSheet.material.map = textures[page + (progress ? 3 : 1)];
    front.visible = back.visible = progress > 0;
    if (progress) {
      front.material.map = textures[page + 1];
      back.material.map = reverseTextures[page + 2];
      shapePaper(turning, 1, progress);
    }
    return Math.sin(progress * Math.PI);
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = false;
  let paused = false;
  let request = 0;
  let elapsed = 0;
  let previousTime = 0;
  let viewportWidth = 0;
  let viewportHeight = 0;

  function draw(now) {
    request = 0;
    if (!active || !canvas.clientWidth || !canvas.clientHeight) return;
    if (!paused && previousTime) elapsed += (now - previousTime) / 1000;
    const { clientWidth, clientHeight } = canvas;
    if (clientWidth !== viewportWidth || clientHeight !== viewportHeight) {
      viewportWidth = clientWidth;
      viewportHeight = clientHeight;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    }
    const lift = trackPages(elapsed);
    camera.position.set(Math.sin(elapsed * .32) * .17 + .08, 5.75 + lift * 1.14, 3.9 + lift * .80);
    camera.lookAt(0, lift * .40, 0);
    renderer.render(scene, camera);
    previousTime = now;
    if (!paused && !reducedMotion) queue();
  }

  function queue() {
    if (active && request === 0) request = requestAnimationFrame(draw);
  }

  new ResizeObserver(queue).observe(canvas);
  return {
    setActive(value) {
      active = value;
      previousTime = 0;
      if (active) {
        elapsed = 0;
        queue();
      }
    },
    setPaused(value) {
      paused = value;
      previousTime = 0;
      queue();
    },
  };
}
