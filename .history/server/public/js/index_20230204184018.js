var files = [0, 0, 0, 0];

function init_grid(files) {
  const grid = document.getElementById("grid");
  const gridSize = Math.ceil(files.length / 4);
  const lastRow = files.length % 4;
  for (let i = 0; i < gridSize; i++) {
    const rowDiv = document.createElement("div");
    if (i < lastRow) {
      var rowLength = 4;
    } else {
      var rowLength = lastRow;
    }
    for (let j = 0; j < rowLength; j++) {
    }
  }
}
