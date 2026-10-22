export const convertSubtitleToVtt = (content, fileName) => {
  const normalized = content.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");

  if (fileName.toLowerCase().endsWith(".vtt")) {
    return normalized.trimStart().startsWith("WEBVTT")
      ? normalized
      : `WEBVTT\n\n${normalized}`;
  }

  const cues = normalized
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block.split("\n");
      const timingIndex = lines.findIndex((line) => line.includes("-->"));
      if (timingIndex === -1) return "";

      const timing = lines[timingIndex].replace(
        /(\d{2}:\d{2}:\d{2}),(\d{3})/g,
        "$1.$2",
      );
      return [timing, ...lines.slice(timingIndex + 1)].join("\n");
    })
    .filter(Boolean);

  return `WEBVTT\n\n${cues.join("\n\n")}\n`;
};
