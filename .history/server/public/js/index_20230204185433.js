var files = [0, 0, 0, 0, 0, 0];

function init_grid(files) {
  const grid = document.getElementById("grid");
  const gridSize = Math.ceil(files.length / 4);
  console.log("Grid size: " + gridSize);
  const lastRow = files.length % 4;
  console.log("Last row: " + lastRow);
  for (let i = 0; i < gridSize; i++) {
    const rowDiv = document.createElement("div");
    rowDiv.id = "row-" + i;
    rowDiv.className = "row";
    grid.appendChild(rowDiv);
    if (i < lastRow) {
      var rowLength = 4;
    } else {
      var rowLength = lastRow;
    }
    for (let j = 0; j < rowLength; j++) {
      const colDiv = document.createElement("div");
      colDiv.id = "col-" + i + "-" + j;
      colDiv.className = "col";
      rowDiv.appendChild(colDiv);
      const img = document.createElement("img");
      img.id = "img-" + i + "-" + j;
      img.className = "grid-img";
      img.src = "/images/filetypes/file-unknown.png";
      colDiv.appendChild(img);
    }
  }
}

window.onload = init_grid(files);
