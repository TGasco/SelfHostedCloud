var files = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const baseDir = "/Users/thomasgascoyne/SelfHostedCloudDrive";

function init_grid() {
  fetch("/metadata").then((response) => response.json()).then((files) => {
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
      if (i < gridSize - 1) {
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
        if (files[i * 4 + j].isDirectory) {
          img.src = "/images/filetypes/folder.png";
        } else {
          img.src = "/images/filetypes/file-unknown.png";
        }
        colDiv.appendChild(img);
      }
    }
  })
}

function GetFileIcon(file) {
  if (file.isDirectory) {
    return "/images/filetypes/folder.png";
  } else {
    switch(file.fileExt) {
      case ".txt":
        return "/images/filetypes/file-txt.png";
      case ".pdf":
        return "/images/filetypes/file-pdf.png";

    }
    return "/images/filetypes/file-unknown.png";
  }
}

window.onload = init_grid();
