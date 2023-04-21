import { fetchWithAuth, } from "./helperfuncs.js";

function submitForm(event) {
  event.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const errorMessage = document.getElementById("errorMessage");

  // Check if the username and password are correct
  fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "username": username,
      "password": password
    })
  })
  .then(res => {
    if (res.status === 200) {
      window.location.href = "/";
    } else {
      errorMessage.innerText = "Incorrect username or password";
      errorMessage.classList.add('show');
    }
  });
}

  function redirectToSignup() {
    window.location.href = "/signup";
  }


function signUp(event) {
  event.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const basedir = document.getElementById("basedir").value;

  const errorMessage = document.getElementById("errorMessage");

  // Check if the username and password are correct
  fetch("/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      "username": username,
      "password": password,
      "basedir": basedir
    })
  }).then(res => {
    if (res.status === 201) {
      // Use server to redirect the user to the homepage
      window.location.href = "/login";
    } else {
      console.log(res);
      errorMessage.innerText = "Incorrect username or password";
      errorMessage.classList.add('show');
    }
  });
}

  function highlightField(field) {
    field.style.borderColor = "#3f51b5";
  }

  function removeHighlight(field) {
    field.style.borderColor = "#ddd";
  }

  function pressButton(button) {
    button.style.transform = "translateY(2px)";
  }

  function releaseButton(button) {
    button.style.transform = "translateY(0)";
  }

document.addEventListener('DOMContentLoaded', () => {
  let form;
  try {
    form = document.getElementById('loginForm');
    form.addEventListener('submit', submitForm);
  } catch (e) {
    form = document.getElementById('signupForm');
    form.addEventListener('submit', signUp);
  }
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const submitButton = form.querySelector('button[type="submit"]');

  try {
    const signupLink = document.getElementById('signup-link');
    signupLink.addEventListener('click', redirectToSignup);
  } catch (e) {
    // We are on the signup page, do nothing
  }

  usernameInput.addEventListener('focus', () => highlightField(usernameInput));
  usernameInput.addEventListener('blur', () => removeHighlight(usernameInput));
  passwordInput.addEventListener('focus', () => highlightField(passwordInput));
  passwordInput.addEventListener('blur', () => removeHighlight(passwordInput));
  submitButton.addEventListener('mousedown', () => pressButton(submitButton));
  submitButton.addEventListener('mouseup', () => releaseButton(submitButton));
});
