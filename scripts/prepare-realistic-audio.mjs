// Reproducible audio preparation. Requires ffmpeg; no Python packages or accounts.
// Source pages are checked for CC0 before public audio previews are downloaded.
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const library = resolve(root, "assets/audio/library/realistic");
const output = resolve(root, "assets/audio/sfx/realistic");
const bsb = (p) => `https://bigsoundbank.com/${p}.html`;
const fs = (user, id) => `https://freesound.org/people/${user}/sounds/${id}/`;
export const recordings = [
  ["cow", bsb("cow-moos-6-s2386"), "Joseph SARDIN", 0, 0, false],
  ["horse", bsb("neighing-of-a-horse-1-s0284"), "Joseph SARDIN", 0, 0, false],
  ["sheep", bsb("sheep-1-s2343"), "Joseph SARDIN", 0, 0, false],
  ["goat", bsb("bleating-goat-1-s0279"), "Joseph SARDIN", 0, 0, false],
  ["pig", fs("JarredGibb", 233175), "JarredGibb", 0, 0, false],
  ["duck", bsb("ducks-s0276"), "Joseph SARDIN", 1, 8, false],
  ["chicken", bsb("hens-lays-s0978"), "Joseph SARDIN", 2, 7, false],
  ["rabbit", bsb("bunny-hutch-s1376"), "Joseph SARDIN", 7, 6, false],
  ["car-idle", fs("jpkweli", 154758), "jpkweli", 4, 14, true],
  ["car-road", bsb("car-interior-80km-h-s0505"), "Joseph SARDIN", 6, 20, true],
  ["tractor", bsb("small-tractor-s0499"), "Joseph SARDIN", 6, 10, true],
  ["coaster-roll", fs("BaDoink", 538758), "BaDoink", 0, 0, true],
  ["coaster-chain", fs("esperar", 171510), "esperar", 1, 12, true],
  [
    "rocket",
    fs("klangfabrik", 220127),
    "klangfabrik / NASA source recordings",
    24,
    24,
    true,
    2600,
  ],
  [
    "propeller",
    bsb("small-airplane-moving-away-s0501"),
    "Joseph SARDIN",
    0.4,
    12,
    true,
  ],
  ["rain", bsb("rain-on-puddle-s1290"), "Joseph SARDIN", 3, 24, true, 6500],
  ["wind", bsb("wind-in-tall-grass-s0908"), "Joseph SARDIN", 4, 24, true, 5500],
  ["ride-wind", bsb("strong-wind-1-s0146"), "Joseph SARDIN", 3, 18, true, 4500],
  [
    "swing",
    bsb("swing-lightly-loaded-s1094"),
    "Joseph SARDIN",
    1,
    12,
    true,
    4000,
  ],
  ["slide", bsb("sliding-rope-1-s1818"), "Joseph SARDIN", 0, 0, true, 4500],
  ["fountain", fs("Legnalegna55", 554789), "Legnalegna55", 5, 24, true, 6500],
  ["leaves", fs("BranndyBottle", 464698), "BranndyBottle", 0, 0, false],
];

await mkdir(library, { recursive: true });
await mkdir(output, { recursive: true });
const sha = (b) => createHash("sha256").update(b).digest("hex");
const run = (args, input) => {
  const r = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", ...args],
    { input, maxBuffer: 80e6 },
  );
  if (r.status !== 0) throw new Error(r.stderr.toString());
  return r.stdout;
};
const records = [];
for (const [
  name,
  page,
  author,
  start,
  duration,
  loop,
  lowpass = 7500,
] of recordings) {
  const raw = resolve(library, `${name}.mp3`);
  const response = await fetch(page);
  if (!response.ok) throw new Error(`${page}: ${response.status}`);
  const html = await response.text();
  if (!/CC0 \(public domain\)|Creative Commons 0/.test(html))
    throw new Error(`Check license: ${page}`);
  const link = page.includes("bigsoundbank")
    ? html.match(/(?:src|href)=['"]([^'"]+\/mp3\/\d+\.mp3)['"]/)?.[1]
    : html.match(
        /https:\/\/cdn\.freesound\.org\/previews\/[^"<>\s]+-hq\.mp3/,
      )?.[0];
  if (!link) throw new Error(`No downloadable preview: ${page}`);
  const download = new URL(link, page).href;
  try {
    await access(raw);
  } catch {
    const audio = await fetch(download);
    if (!audio.ok) throw new Error(`${download}: ${audio.status}`);
    await writeFile(raw, Buffer.from(await audio.arrayBuffer()));
  }
  // Decode into PCM, reduce sub-bass and harsh highs, gently compress transients.
  const rawPcm = run([
    "-ss",
    String(start),
    "-i",
    raw,
    ...(duration ? ["-t", String(duration)] : []),
    "-af",
    `highpass=f=65,lowpass=f=${lowpass},acompressor=threshold=0.15:ratio=2:attack=30:release=200`,
    "-ar",
    "44100",
    "-ac",
    "1",
    "-f",
    "f32le",
    "pipe:1",
  ]);
  let samples = new Float32Array(
    rawPcm.buffer,
    rawPcm.byteOffset,
    Math.floor(rawPcm.byteLength / Float32Array.BYTES_PER_ELEMENT),
  ).slice();
  if (samples.length < 4410) throw new Error(`Empty sound ${name}`);
  if (loop) {
    // Rotate the seam into an overlap. Both ends join the same original waveform;
    // no silence pads or hard cuts, and no HTML media-element loop gaps.
    const overlap = Math.min(22050, Math.floor(samples.length / 5));
    const result = new Float32Array(samples.length - overlap);
    result.set(samples.subarray(overlap, samples.length - overlap));
    for (let i = 0; i < overlap; i++) {
      const blend = (1 - Math.cos((Math.PI * i) / (overlap - 1))) / 2;
      result[result.length - overlap + i] =
        samples[samples.length - overlap + i] * (1 - blend) +
        samples[i] * blend;
    }
    samples = result;
  } else {
    const fade = Math.min(2205, Math.floor(samples.length / 10));
    for (let i = 0; i < fade; i++) {
      samples[i] *= i / fade;
      samples[samples.length - 1 - i] *= i / fade;
    }
  }
  let peak = 0,
    square = 0;
  for (const s of samples) {
    peak = Math.max(peak, Math.abs(s));
    square += s * s;
  }
  const gain = Math.min(
    10 ** (-21 / 20) / Math.sqrt(square / samples.length),
    10 ** (-4 / 20) / peak,
  );
  for (let i = 0; i < samples.length; i++) samples[i] *= gain;
  const file = resolve(output, `${name}.mp3`);
  run(
    [
      "-y",
      "-f",
      "f32le",
      "-ar",
      "44100",
      "-ac",
      "1",
      "-i",
      "pipe:0",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "128k",
      file,
    ],
    Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength),
  );
  const info = {
    name,
    source_page: page,
    download,
    author,
    license: "CC0-1.0",
    license_url: "https://creativecommons.org/publicdomain/zero/1.0/",
    source_file: `library/realistic/${name}.mp3`,
    source_sha256: sha(await readFile(raw)),
    file: `sfx/realistic/${name}.mp3`,
    sha256: sha(await readFile(file)),
    source_start_seconds: start,
    seconds: Number((samples.length / 44100).toFixed(3)),
    loop,
    processing: `Mono 44.1kHz; 65Hz high-pass, ${lowpass}Hz low-pass; gentle compression; RMS target -21dBFS, peak ceiling -4dBFS; ${loop ? "cosine overlap loop seam" : "50ms edge fades"}.`,
  };
  records.push(info);
  console.log(
    `${name}: ${info.seconds}s ${loop ? "continuous loop" : "natural call/one-shot"}`,
  );
}
await writeFile(
  resolve(root, "assets/audio/realistic-manifest.json"),
  JSON.stringify(
    {
      date: "2026-09-19",
      note: "Public MP3 downloads/previews, preserved with source credits. Runtime derivatives only are bundled. Rabbit is movement in bedding, not a vocalization. Roller Loop is original rolling foley. No endorsement implied by NASA credit.",
      records,
    },
    null,
    2,
  ) + "\n",
);
