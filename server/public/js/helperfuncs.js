function regexMatch(pattern, str) {
  let regex = new RegExp(pattern);
  return regex.test(str);
}

export function ConvertDate(date) {
  date = new Date(date);

  // Check time elapsed since the date
  const timeElapsed = Date.now() - date.getTime();

  if (timeElapsed < 60000) {
    return "Just now";
  } else if (timeElapsed < 3600000) {
    const minutes = Math.floor(timeElapsed / 60000);
    return minutes === 1 ? "1 minute ago" : minutes + " minutes ago";
  } else if (timeElapsed < 86400000) {
    const hours = Math.floor(timeElapsed / 3600000);
    return (hours === 1 ? "1 hour ago" : hours + " hours ago") + " (" + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ")";
  } else if (timeElapsed > 86400000 && timeElapsed < 172800000) {
    return "Yesterday at " + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } else if (timeElapsed < 604800000 && timeElapsed > 2419200000) {
    const days = Math.floor(timeElapsed / 86400000);
    return (days === 1 ? "1 day ago" : days + " days ago") + " at " + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } else {
    return `${date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })} at ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
  }
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

/**
 * Redirect the user to the login page.
 */
export function redirectToLogin() {
  console.log("Uh oh, you can't view this content!");
  window.location.href = "/login";
}

export async function fetchWithAuth(url, options = {}) {
  options.credentials = 'include'; // Send cookies with the request

  const response = await fetch(url, options);

  if (response.status === 401) {
    const refreshResponse = await fetch('/token', {
      method: 'POST',
      credentials: 'include', // Send cookies with the request
    });
    if (refreshResponse.ok) {
      const { accessToken } = await refreshResponse.json();

      // Update the accessToken cookie manually if necessary
      // e.g., if your client is on a different domain than your server


      // Retry the original request with the new accessToken
      return fetch(url, options);
    } else {
      // Redirect to login or handle refresh token error
      throw new Error('Refresh token failed');
    }
  }

  return response;
}
