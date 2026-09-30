import * as THREE from "three";

export function createUVCheckerTexture(size = 1024, cells = 8): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D context unavailable");

  const cellSize = size / cells;
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#ff5555" : "#5555ff";
      ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
      ctx.fillStyle = "#ffffff";
      ctx.font = `${cellSize * 0.3}px sans-serif`;
      ctx.fillText(`${col},${row}`, col * cellSize + 4, row * cellSize + cellSize * 0.4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}
