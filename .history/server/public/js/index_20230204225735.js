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
      if (i < gridSize) {
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
        img.src = GetFileIcon(files[i * 4 + j]);
        colDiv.appendChild(img);

        const fileName = document.createElement("p");
        fileName.id = "filename-" + i + "-" + j;
        fileName.className = "grid-filename";
        fileName.innerHTML = files[i * 4 + j].fileName;
      }
    }
  })
}

function GetFileIcon(file) {
  if (file.isDirectory) {
    return "/images/filetypes/folder.png";
  } else {
    switch(file.fileExt) {
      case ".3ds":
        return "/images/filetypes/3ds.png";
      case ".aac":
        return "/images/filetypes/aac.png";
      case ".ai":
        return "/images/filetypes/ai.png";
      case ".avi":
        return "/images/filetypes/avi.png";
      case ".bmp":
        return "/images/filetypes/bmp.png";
      case ".cad":
        return "/images/filetypes/cad.png";
      case ".cdr":
        return "/images/filetypes/cdr.png";
      case ".css":
        return "/images/filetypes/css.png";
      case ".dat":
        return "/images/filetypes/dat.png";
      case ".dll":
        return "/images/filetypes/dll.png";
      case ".doc":
        return "/images/filetypes/doc.png";
      case ".docx":
        return "/images/filetypes/doc.png";
      case ".eps":
        return "/images/filetypes/eps.png";
      case ".fla":
        return "/images/filetypes/fla.png";
      case ".flv":
        return "/images/filetypes/flv.png";
      case ".gif":
        return "/images/filetypes/gif.png";
      case ".html":
        return "/images/filetypes/html.png";
      case ".indd":
        return "/images/filetypes/indd.png";
      case ".iso":
        return "/images/filetypes/iso.png";
      case ".jpg":
        return "/images/filetypes/jpg.png";
      case ".js":
        return "/images/filetypes/js.png";
      case ".midi":
        return "/images/filetypes/midi.png";
      case ".mov":
        return "/images/filetypes/mov.png";
      case ".mp3":
        return "/images/filetypes/mp3.png";
      case ".mpg":
        return "/images/filetypes/mpg.png";
      case ".pdf":
        return "/images/filetypes/pdf.png";
      case ".php":
        return "/images/filetypes/php.png";
      case ".png":
        return "/images/filetypes/png.png";
      case ".ppt":
        return "/images/filetypes/ppt.png";
      case ".ps":
        return "/images/filetypes/ps.png";
      case ".psd":
        return "/images/filetypes/psd.png";
      case ".raw":
        return "/images/filetypes/raw.png";
      case ".sql":
        return "/images/filetypes/sql.png";
      case ".svg":
        return "/images/filetypes/svg.png";
      case ".tif":
        return "/images/filetypes/tif.png";
      case ".txt":
        return "/images/filetypes/txt.png";
      case ".wmv":
        return "/images/filetypes/wmv.png";
      case ".xls":
        return "/images/filetypes/xls.png";
      case ".xml":
        return "/images/filetypes/xml.png";
      case ".zip":
        return "/images/filetypes/zip.png";
      default:
        return "/images/filetypes/file-unknown.png";
    }
  }
}

window.onload = init_grid();
