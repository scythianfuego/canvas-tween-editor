const cursor = document.getElementById("cursor");
let activeEditor;

function createTrack(id, max, units, points) {
  const editor = new TweenEditor(document.getElementById(id), {
    height: 120,
    endTime: 4000,
    ticksPerSecond: 1000,
    min: 0,
    max,
    maxUnmapped: max,
    units,
    onPointSelection() {
      activeEditor = editor;
    },
    onTimelineMove({ time }) {
      cursor.textContent = `Cursor ${time} ms`;
    },
  });
  editor.setPoints(points);
  return editor;
}

const position = createTrack("position", 320, " px", [
  { x: 0, y: 20, tag: "Start" },
  { x: 1100, y: 180 },
  { x: 2400, y: 290 },
  { x: 4000, y: 240 },
]);
const scale = createTrack("scale", 150, "%", [
  { x: 0, y: 70 },
  { x: 1100, y: 125 },
  { x: 2400, y: 100 },
]);
const opacity = createTrack("opacity", 100, "%", [
  { x: 0, y: 0 },
  { x: 550, y: 100 },
  { x: 3100, y: 100 },
  { x: 4000, y: 0 },
]);

TweenEditor.link([position, scale, opacity]);

document.getElementById("space-points").onclick = () => activeEditor?.spaceSelectedPoints();
document.getElementById("align-value").onclick = () => activeEditor?.alignLastSelectedValue();
document.getElementById("sine-up").onclick = () => activeEditor?.interpolateSelectedSine(true);
document.getElementById("sine-down").onclick = () => activeEditor?.interpolateSelectedSine(false);
document.getElementById("delete-points").onclick = () => activeEditor?.deleteSelectedPoints();
