function regexMatch(pattern, str) {
  let regex = new RegExp(pattern);
  return regex.test(str);
}

export function ConvertDate(date) {
  date = new Date(date);
  return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })} at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

export function BytesToSize(bytes) {
  let sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  if (bytes == 0) return '0 Byte';
  let i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

export function truncatePath(filePath, element) {
  const tempElement = element.cloneNode();
  tempElement.style.visibility = 'hidden';
  tempElement.style.position = 'absolute';
  document.body.appendChild(tempElement);

  tempElement.textContent = filePath;

  if (tempElement.clientWidth < tempElement.parentElement.clientWidth * 0.75) {
    document.body.removeChild(tempElement);
    return filePath;
  }

  let pathSegments = filePath.split("/");
  let truncatedPath = `/${pathSegments.pop()}`;

  while (pathSegments.length > 0) {
    const newPath = `/${pathSegments.pop()}${truncatedPath}`;
    tempElement.textContent = newPath;

    if (tempElement.clientWidth >= tempElement.parentElement.clientWidth * 0.75) {
      document.body.removeChild(tempElement);
      break;
    } else {
      truncatedPath = newPath;
    }
  }

  return truncatedPath;
}
