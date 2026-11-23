/* An original holographic city, projected onto a 2D canvas. */
function createDigitalScene(canvas) {
  const context = canvas.getContext('2d', { alpha: false });
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const frameInterval = 1000 / 30;
  const tau = 2 * Math.PI;

  let seed = 19343;
  function random() {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  const buildings = [];
  for (const [depth, limit, count, cityHeight] of [[28, 40, 25, 6], [20, 34, 23, 6.5], [13.2, 20, 19, 5.2]]) {
    for (let i = 0; i < count; i++) {
      const x = -limit + i * 2 * limit / (count - 1) + (random() - .5) * 1.4;
      const center = .58 + .42 * (1 - Math.min(1, Math.abs(x) / limit));
      buildings.push({
        x,
        z: depth + random() * 2.1,
        width: .66 + random() * 1.3,
        depth: .55 + random() * 1.65,
        height: .8 + cityHeight * center * Math.pow(random(), 1.45),
        tone: random(),
        beacon: random() < .24,
        phase: random(),
      });
    }
  }
  buildings.sort((a, b) => b.z - a.z);

  const sparks = Array.from({ length: 118 }, () => ({
    x: random(), y: random(), speed: .009 + random() * .045,
    size: .45 + random() * 1.15, phase: random(), tone: random(),
  }));
  const streams = Array.from({ length: 33 }, () => ({
    x: random(), y: random(), speed: .075 + random() * .13,
    length: .02 + random() * .16, phase: random(), tone: random(),
  }));

  let width = 0;
  let height = 0;
  let resolution = 0;
  let playing = false;
  let paused = false;
  let theme = 'exhibit';
  let request = 0;
  let lastFrame = 0;
  let elapsed = 0;
  let backdrop;
  let vignette;

  function prepareSky() {
    backdrop = context.createLinearGradient(0, 0, width * .065, height);
    backdrop.addColorStop(0, '#060718');
    backdrop.addColorStop(.36, '#080829');
    backdrop.addColorStop(.66, '#0a1233');
    backdrop.addColorStop(1, '#050818');

    vignette = context.createRadialGradient(width * .52, height * .54, height * .28, width * .52, height * .54, width * .64);
    vignette.addColorStop(0, 'rgba(4, 5, 19, 0)');
    vignette.addColorStop(.64, 'rgba(4, 5, 19, .11)');
    vignette.addColorStop(1, 'rgba(4, 5, 19, .65)');
  }

  function fit() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.35);
    if (width !== rect.width || height !== rect.height || resolution !== pixelRatio) {
      width = rect.width;
      height = rect.height;
      resolution = pixelRatio;
      canvas.width = Math.round(width * resolution);
      canvas.height = Math.round(height * resolution);
      context.setTransform(resolution, 0, 0, resolution, 0, 0);
      prepareSky();
    }
    return true;
  }

  function line(x1, y1, x2, y2) {
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
  }

  function light(x, y, radius, color, opacity, stretch = 1) {
    context.save();
    context.translate(x, y);
    context.scale(1, stretch);
    const glow = context.createRadialGradient(0, 0, 0, 0, 0, radius);
    glow.addColorStop(0, `rgba(${color}, ${opacity})`);
    glow.addColorStop(.31, `rgba(${color}, ${opacity * .44})`);
    glow.addColorStop(1, `rgba(${color}, 0)`);
    context.fillStyle = glow;
    context.fillRect(-radius, -radius, radius * 2, radius * 2);
    context.restore();
  }

  function shape(points, color, edge) {
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) context.lineTo(points[i][0], points[i][1]);
    context.closePath();
    context.fillStyle = color;
    context.fill();
    context.strokeStyle = edge;
    context.stroke();
  }

  function display(time) {
    const hasText = theme === 'wing' || theme === 'bridge';
    const focus = width * (hasText ? .69 : .5) + width * .022 * Math.sin(time * .245);
    const horizon = height * .645 + height * .008 * Math.sin(time * .38);
    const lens = height * .89;
    const paletteCycle = .5 + .5 * Math.sin(time * .53);
    const hueOffset = theme === 'wing' ? 9 : theme === 'bridge' ? -11 : 0;
    const project = (x, y, z) => [focus + x * lens / z, horizon + (1.1 - y) * lens / z];

    context.globalAlpha = 1;
    context.fillStyle = backdrop;
    context.fillRect(0, 0, width, height);
    light(focus - width * .21, horizon - height * .095, width * .39, '17, 79, 228', .36 + .13 * paletteCycle, .72);
    light(focus + width * .16, horizon - height * .26, width * .44, '111, 31, 226', .37 + .16 * (1 - paletteCycle), .85);
    light(focus + width * .23, horizon - height * .025, width * .34, '215, 30, 230', .22, .62);

    for (const spark of sparks) {
      const x = spark.x * width + width * .011 * Math.sin(time * .54 + spark.phase * tau);
      const y = ((spark.y - time * spark.speed) % 1 + 1) % 1 * height * .79;
      const alpha = (.16 + .42 * (.5 + .5 * Math.sin(time * 1.15 + spark.phase * tau)));
      context.fillStyle = `hsla(${spark.tone < .62 ? 193 : 285}, 100%, 77%, ${alpha})`;
      context.fillRect(x, y, spark.size, spark.size);
    }

    drawOrbits(time, focus, horizon, hasText);

    for (const stream of streams) {
      const x = width * (hasText ? .32 + stream.x * .68 : stream.x);
      const y = ((stream.y + time * stream.speed) % 1) * height;
      const tail = stream.length * height;
      const shade = stream.tone < .48 ? '40, 186, 255' : '201, 77, 255';
      const trace = context.createLinearGradient(x, y - tail, x, y);
      trace.addColorStop(0, `rgba(${shade}, 0)`);
      trace.addColorStop(.86, `rgba(${shade}, .08)`);
      trace.addColorStop(1, `rgba(${shade}, .36)`);
      context.fillStyle = trace;
      context.fillRect(x, y - tail, stream.tone > .85 ? 2 : 1, tail);
    }

    drawGrid(time, focus, horizon, lens, paletteCycle);
    context.lineWidth = Math.max(.6, height / 740);
    for (const building of buildings) drawBuilding(building, time, project, hueOffset, paletteCycle);

    // The band of light ties the bases of the buildings into the grid.
    light(focus - width * .1, horizon + height * .075, width * .47, '32, 159, 255', .42, .075);
    light(focus + width * .24, horizon + height * .08, width * .27, '201, 62, 255', .34, .12);
    context.fillStyle = vignette;
    context.fillRect(0, 0, width, height);

    if (hasText) {
      const textShade = context.createLinearGradient(0, 0, width, 0);
      textShade.addColorStop(0, 'rgba(4, 5, 20, .79)');
      textShade.addColorStop(.34, 'rgba(4, 5, 20, .52)');
      textShade.addColorStop(.7, 'rgba(4, 5, 20, 0)');
      context.fillStyle = textShade;
      context.fillRect(0, 0, width, height);
    }
  }

  function drawOrbits(time, focus, horizon, hasText) {
    const rx = width * (hasText ? .258 : .318);
    const ry = height * .435;
    const cy = horizon - height * .104;
    const orbitColors = ['56, 129, 255', '75, 196, 255', '152, 78, 255', '214, 94, 244'];
    for (let i = 0; i < orbitColors.length; i++) {
      const scale = .86 + i * .15;
      const color = orbitColors[i];
      context.strokeStyle = `rgba(${color}, .18)`;
      context.lineWidth = i % 2 ? 1.4 : .8;
      context.beginPath();
      context.ellipse(focus, cy, rx * scale, ry * scale, 0, Math.PI * 1.014, Math.PI * 1.986);
      context.stroke();

      const widthOfArc = .45 + .17 * i;
      const start = Math.PI * 1.51 + Math.sin(time * (.27 + i * .035) + i * 1.8) * .78 - widthOfArc / 2;
      context.strokeStyle = `rgba(${color}, ${i === 1 ? .54 : .37})`;
      context.lineWidth = i % 2 ? 2 : 1.4;
      context.beginPath();
      context.ellipse(focus, cy, rx * scale, ry * scale, 0, start, start + widthOfArc);
      context.stroke();

      context.beginPath();
      context.strokeStyle = `rgba(${color}, .25)`;
      context.lineWidth = .8;
      for (let j = 1; j < 47; j++) {
        const angle = Math.PI + j * Math.PI / 47;
        const sin = Math.sin(angle);
        const cos = Math.cos(angle);
        const tick = j % 6 === 0 ? .033 : .011;
        line(focus + cos * rx * scale, cy + sin * ry * scale,
          focus + cos * rx * (scale + tick), cy + sin * ry * (scale + tick));
      }
      context.stroke();
    }
  }

  function drawGrid(time, focus, horizon, lens, palette) {
    const floor = context.createLinearGradient(0, horizon, 0, height);
    floor.addColorStop(0, 'rgba(26, 33, 91, .27)');
    floor.addColorStop(1, 'rgba(6, 8, 29, .88)');
    context.fillStyle = floor;
    context.fillRect(0, horizon, width, height - horizon);

    const grid = context.createLinearGradient(0, horizon, 0, height);
    grid.addColorStop(0, 'rgba(64, 161, 255, .44)');
    grid.addColorStop(.43, 'rgba(80, 129, 255, .28)');
    grid.addColorStop(1, 'rgba(142, 66, 255, .25)');
    context.strokeStyle = grid;
    context.lineWidth = .85;
    context.beginPath();
    for (let i = -36; i <= 36; i++) {
      const unit = i * lens * .89;
      line(focus + unit / 35, horizon + 1.1 * lens / 35, focus + unit / 2.4, horizon + 1.1 * lens / 2.4);
    }
    const travel = (time * 1.12) % 1.32;
    for (let i = 2; i <= 25; i++) {
      const depth = i * 1.32 + 1 - travel;
      const y = horizon + 1.1 * lens / depth;
      if (y < height) line(0, y, width, y);
    }
    context.stroke();

    for (let i = 0; i < 3; i++) {
      const wave = ((time * .20 + i * .333) % 1);
      const y = horizon + height * .069 + (height - horizon - height * .069) * wave * wave;
      const alpha = .52 * Math.sin(wave * Math.PI);
      const scan = context.createLinearGradient(focus - width * .53, 0, focus + width * .53, 0);
      scan.addColorStop(0, 'rgba(33, 96, 255, 0)');
      scan.addColorStop(.34, `rgba(81, 152, 255, ${alpha * (.7 + palette * .3)})`);
      scan.addColorStop(.69, `rgba(177, 81, 255, ${alpha})`);
      scan.addColorStop(1, 'rgba(160, 46, 255, 0)');
      context.fillStyle = scan;
      context.fillRect(0, y, width, 1.4);
    }
  }

  function drawBuilding(building, time, project, hueOffset, paletteCycle) {
    const { x, z, width: w, depth: d, height: h, phase } = building;
    const left = x - w / 2;
    const right = x + w / 2;
    const back = z + d;
    const hue = 191 + building.tone * 98 + hueOffset + 10 * paletteCycle;
    const brightness = z < 17 ? .79 : z < 23 ? .56 : .35;
    const frontLeft = project(left, 0, z);
    const frontRight = project(right, 0, z);
    const roofLeft = project(left, h, z);
    const roofRight = project(right, h, z);
    if (Math.max(frontLeft[0], roofLeft[0], frontRight[0]) < -width * .14 ||
        Math.min(frontLeft[0], roofRight[0], frontRight[0]) > width * 1.14) return;

    const sideX = x > 0 ? left : right;
    const sideFront = project(sideX, 0, z);
    const sideBack = project(sideX, 0, back);
    const sideRoofFront = project(sideX, h, z);
    const sideRoofBack = project(sideX, h, back);
    const edge = `hsla(${hue}, 100%, 72%, ${brightness})`;
    shape([sideFront, sideBack, sideRoofBack, sideRoofFront], `hsla(${hue}, 72%, 15%, .63)`, edge);
    shape([roofLeft, roofRight, project(right, h, back), project(left, h, back)],
      `hsla(${hue}, 80%, 29%, .58)`, `hsla(${hue}, 100%, 77%, ${brightness * .9})`);
    shape([frontLeft, frontRight, roofRight, roofLeft], `hsla(${hue}, 78%, 18%, .71)`, edge);

    const storeys = Math.max(2, Math.floor(h * 3.05));
    const columns = Math.min(5, Math.ceil(w * 2.25));
    const isBright = (row, col) => (row * 7 + col * 11 + Math.floor(phase * 79)) % 13 < 4;
    const scanIndex = Math.floor(((time * .4 + phase) % 1) * storeys);
    for (let row = 1; row < storeys; row++) {
      const y = frontLeft[1] + (roofLeft[1] - frontLeft[1]) * row / storeys;
      const floorHeight = (frontLeft[1] - roofLeft[1]) / storeys;
      const colWidth = (frontRight[0] - frontLeft[0]) / columns;
      context.beginPath();
      line(frontLeft[0], y, frontRight[0], y);
      const sideY = (h * row) / storeys;
      line(...project(sideX, sideY, z), ...project(sideX, sideY, back));
      context.strokeStyle = `hsla(${hue}, 100%, 73%, ${brightness * (row === scanIndex ? .87 : .26)})`;
      context.stroke();
      for (let col = 0; col < columns; col++) {
        if (!isBright(row, col) && row !== scanIndex) continue;
        context.fillStyle = `hsla(${hue}, 98%, 70%, ${brightness * (row === scanIndex ? .72 : .46)})`;
        context.fillRect(frontLeft[0] + (col + .2) * colWidth, y + floorHeight * .2, Math.max(1, colWidth * .55), Math.max(.7, floorHeight * .24));
      }
    }

    context.strokeStyle = `hsla(${hue}, 100%, 67%, ${brightness * .33})`;
    context.beginPath();
    for (let col = 1; col < columns; col++) {
      const position = frontLeft[0] + (frontRight[0] - frontLeft[0]) * col / columns;
      line(position, frontLeft[1], position, roofLeft[1]);
    }
    context.stroke();

    if (building.beacon) {
      const tip = project(x, h + .34, z + d * .27);
      const mast = project(x, h, z + d * .27);
      const pulse = .43 + .3 * Math.sin(time * 2.1 + phase * tau);
      context.beginPath();
      line(...tip, ...mast);
      context.strokeStyle = `hsla(${hue}, 100%, 77%, ${brightness * .8})`;
      context.stroke();
      context.fillStyle = `hsla(${hue}, 100%, 84%, ${pulse})`;
      context.beginPath();
      context.arc(tip[0], tip[1], z < 17 ? 2 : 1.4, 0, tau);
      context.fill();
    }
  }

  function frame(now) {
    request = 0;
    if (!playing) return;
    const animate = !paused && !motionPreference.matches;
    const delta = lastFrame ? now - lastFrame : frameInterval;
    if (!animate || !lastFrame || delta >= frameInterval - 2) {
      if (animate && lastFrame) elapsed += Math.min(.075, delta / 1000);
      lastFrame = now;
      if (fit()) display(elapsed);
    }
    if (animate) queueFrame();
  }

  function queueFrame() {
    if (playing && !request) request = requestAnimationFrame(frame);
  }

  new ResizeObserver(queueFrame).observe(canvas);
  motionPreference.addEventListener('change', () => {
    lastFrame = 0;
    queueFrame();
  });
  return {
    setActive(active) {
      playing = active;
      lastFrame = 0;
      if (playing) queueFrame();
      else if (request) {
        cancelAnimationFrame(request);
        request = 0;
      }
    },
    setPaused(value) {
      paused = value;
      lastFrame = 0;
      queueFrame();
    },
    setTheme(value) {
      if (theme === value) return;
      theme = value;
      lastFrame = 0;
      queueFrame();
    },
  };
}
